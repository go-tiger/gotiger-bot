import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, type AxiosResponse } from 'axios';
import { firstValueFrom, type Observable } from 'rxjs';
import {
  CHZZK_GRANT_TYPES,
  CHZZK_URLS,
} from '../../../common/config/chzzk.config';

export interface ChzzkToken {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string | null;
}

export interface ChzzkChannel {
  channelId: string;
  channelName: string;
}

/** 치지직 오픈 API 호출을 담당한다. 저장은 하지 않는다. */
@Injectable()
export class ChzzkApiService {
  private readonly logger = new Logger(ChzzkApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /** 유저를 보낼 치지직 인가 화면 URL. */
  buildAuthUrl(state: string): string {
    const params = new URLSearchParams({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      state,
    });

    return `${CHZZK_URLS.authorize}?${params.toString()}`;
  }

  /** 인가 코드를 액세스 토큰으로 교환한다. */
  async issueToken(code: string, state: string): Promise<ChzzkToken> {
    return this.requestToken({
      grantType: CHZZK_GRANT_TYPES.authorizationCode,
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      code,
      state,
    });
  }

  async refreshToken(refreshToken: string): Promise<ChzzkToken> {
    return this.requestToken({
      grantType: CHZZK_GRANT_TYPES.refreshToken,
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      refreshToken,
    });
  }

  /** 연결된 계정의 채널 정보를 조회한다. */
  async fetchChannel(
    tokenType: string,
    accessToken: string,
  ): Promise<ChzzkChannel> {
    const data = await this.request<{
      content: { channelId: string; channelName: string };
    }>(
      () =>
        this.httpService.get(`${CHZZK_URLS.openApi}/open/v1/users/me`, {
          headers: {
            Authorization: `${tokenType} ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      '채널 조회',
    );

    return {
      channelId: data.content.channelId,
      channelName: data.content.channelName,
    };
  }

  /**
   * 유저 세션 URL 을 발급받는다. auth 토큰이 쿼리에 포함된 채로 내려오며,
   * 이 URL 에 socket.io 로 접속한다. 유저당 동시 연결은 3개까지다.
   */
  async createUserSession(
    tokenType: string,
    accessToken: string,
  ): Promise<string> {
    const data = await this.request<{ content: { url: string } }>(
      () =>
        this.httpService.get(`${CHZZK_URLS.openApi}/open/v1/sessions/auth`, {
          headers: this.authHeaders(tokenType, accessToken),
        }),
      '세션 발급',
    );

    return data.content.url;
  }

  /** 세션에 후원 이벤트를 구독한다. sessionKey 는 소켓 연결 후 얻는다. */
  async subscribeDonation(
    tokenType: string,
    accessToken: string,
    sessionKey: string,
  ): Promise<void> {
    await this.request(
      () =>
        this.httpService.post(
          `${CHZZK_URLS.openApi}/open/v1/sessions/events/subscribe/donation`,
          {},
          {
            headers: this.authHeaders(tokenType, accessToken),
            params: { sessionKey },
          },
        ),
      '후원 이벤트 구독',
    );
  }

  private authHeaders(
    tokenType: string,
    accessToken: string,
  ): Record<string, string> {
    return {
      Authorization: `${tokenType} ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async requestToken(
    body: Record<string, string>,
  ): Promise<ChzzkToken> {
    const data = await this.request<{
      content: {
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        expiresIn: number;
        scope?: string;
      };
    }>(() => this.httpService.post(CHZZK_URLS.token, body), '토큰 발급');

    return {
      accessToken: data.content.accessToken,
      refreshToken: data.content.refreshToken,
      tokenType: data.content.tokenType,
      expiresIn: data.content.expiresIn,
      scope: data.content.scope ?? null,
    };
  }

  /**
   * 치지직은 실패 사유를 응답 본문에 JSON 으로 담아준다.
   * 그대로 던지면 사유가 묻히므로 로그로 남기고 메시지에 실어 올린다.
   */
  private async request<T>(
    send: () => Observable<AxiosResponse<T>>,
    action: string,
  ): Promise<T> {
    try {
      const { data } = await firstValueFrom(send());
      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const payload = JSON.stringify(error.response?.data);

        this.logger.error(`치지직 ${action} 실패 (${status}): ${payload}`);

        throw new BadRequestException(
          `치지직 ${action}에 실패했습니다. (${status}) ${payload ?? ''}`,
        );
      }

      throw error;
    }
  }

  private get clientId(): string {
    return this.configService.get<string>('CHZZK_CLIENT_ID') ?? '';
  }

  private get clientSecret(): string {
    return this.configService.get<string>('CHZZK_CLIENT_SECRET') ?? '';
  }

  private get redirectUri(): string {
    return this.configService.get<string>('CHZZK_REDIRECT_URI') ?? '';
  }
}
