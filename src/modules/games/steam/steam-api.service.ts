import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  PALWORLD_APP_ID,
  STEAM_CLAIMED_ID_PATTERN,
  STEAM_OPENID,
  STEAM_URLS,
} from '../../../common/config/steam.config';

export interface SteamProfile {
  steamId: string;
  personaName: string;
}

/**
 * 스팀은 OAuth2 가 아니라 OpenID 2.0 이다.
 * 클라이언트 시크릿이 없고, 돌아온 파라미터를 스팀에 되물어 검증한다.
 * Web API 키는 프로필·소유 게임 조회에만 쓴다.
 */
@Injectable()
export class SteamApiService {
  private readonly logger = new Logger(SteamApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 인가 화면 URL. state 파라미터가 없는 규격이라
   * return_to 쿼리에 Discord 정보를 실어 보낸다.
   * 스팀이 return_to 를 그대로 돌려주고 검증 대상에도 포함되어 변조되지 않는다.
   */
  buildAuthUrl(discordId: string, guildId: string): string {
    const returnTo = `${this.redirectUri}?d=${discordId}&g=${guildId}`;

    const params = new URLSearchParams({
      'openid.ns': STEAM_OPENID.ns,
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnTo,
      'openid.realm': this.realm,
      'openid.identity': STEAM_OPENID.identifierSelect,
      'openid.claimed_id': STEAM_OPENID.identifierSelect,
    });

    return `${STEAM_URLS.openId}?${params.toString()}`;
  }

  /**
   * 돌아온 openid.* 파라미터를 스팀에 그대로 되돌려 진위를 확인한다.
   * 이 검증을 건너뛰면 누구나 SteamID 를 위조해 콜백을 호출할 수 있다.
   */
  async verifyCallback(query: Record<string, string>): Promise<string> {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key.startsWith('openid.')) body.append(key, value);
    }
    body.set('openid.mode', STEAM_OPENID.checkAuthentication);

    const { data } = await firstValueFrom(
      this.httpService.post<string>(STEAM_URLS.openId, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    if (!/is_valid\s*:\s*true/.test(data)) {
      this.logger.warn(`스팀 OpenID 검증 실패: ${data.replace(/\s+/g, ' ')}`);
      throw new BadRequestException('스팀 인증을 확인하지 못했습니다.');
    }

    const claimedId = query['openid.claimed_id'] ?? '';
    const matched = STEAM_CLAIMED_ID_PATTERN.exec(claimedId);
    if (!matched) {
      throw new BadRequestException('스팀 계정 정보를 읽지 못했습니다.');
    }

    return matched[1];
  }

  async fetchProfile(steamId: string): Promise<SteamProfile> {
    const { data } = await firstValueFrom(
      this.httpService.get<{
        response: { players: { steamid: string; personaname: string }[] };
      }>(`${STEAM_URLS.webApi}/ISteamUser/GetPlayerSummaries/v2/`, {
        params: { key: this.apiKey, steamids: steamId },
      }),
    );

    const player = data.response.players[0];
    if (!player) {
      throw new BadRequestException('스팀 프로필을 조회하지 못했습니다.');
    }

    return { steamId: player.steamid, personaName: player.personaname };
  }

  /**
   * 팰월드 소유 여부. 프로필의 게임 상세 정보가 비공개면 목록이 비어 오는데,
   * 그건 미소유와 구분할 수 없으므로 false 로 본다.
   * 연동 자체를 막지는 않고 안내에만 쓴다.
   */
  async ownsPalworld(steamId: string): Promise<boolean> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<{
          response: { games?: { appid: number }[] };
        }>(`${STEAM_URLS.webApi}/IPlayerService/GetOwnedGames/v1/`, {
          params: {
            key: this.apiKey,
            steamid: steamId,
            appids_filter: [PALWORLD_APP_ID],
            input_json: JSON.stringify({
              steamid: steamId,
              appids_filter: [PALWORLD_APP_ID],
            }),
          },
        }),
      );

      return (data.response.games ?? []).some(
        (game) => game.appid === PALWORLD_APP_ID,
      );
    } catch (error) {
      // 소유 확인 실패로 연동까지 막지는 않는다.
      this.logger.warn(`팰월드 소유 확인 실패: steamId=${steamId}`, error);
      return false;
    }
  }

  private get apiKey(): string {
    return this.configService.get<string>('STEAM_API_KEY') ?? '';
  }

  private get redirectUri(): string {
    return this.configService.get<string>('STEAM_REDIRECT_URI') ?? '';
  }

  /** realm 은 return_to 를 포함하는 상위 경로여야 한다. */
  private get realm(): string {
    return this.configService.get<string>('BASE_URL') ?? '';
  }
}
