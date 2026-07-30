import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../common/entities/user.entity';
import { Steam } from '../../../common/entities/steam.entity';
import { GamePalworld } from '../../../common/entities/game-palworld.entity';
import {
  STEAM_LINKED_EVENT,
  SteamLinkedEvent,
} from '../../../common/events/steam-linked.event';
import { SteamApiService, type SteamProfile } from './steam-api.service';

export interface SteamLinkResult {
  steam: Steam;
  ownsPalworld: boolean;
}

/**
 * Steam 계정 연동. 스팀은 게임이 아니라 계정 제공자라
 * 여러 게임이 이 결과를 공유한다. 팰월드는 소유 여부만 따로 기록한다.
 */
@Injectable()
export class SteamAuthService {
  private readonly logger = new Logger(SteamAuthService.name);

  constructor(
    private readonly steamApiService: SteamApiService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Steam)
    private readonly steamRepository: Repository<Steam>,
    @InjectRepository(GamePalworld)
    private readonly palworldRepository: Repository<GamePalworld>,
  ) {}

  createAuthUrl(discordId: string, guildId: string): string {
    return this.steamApiService.buildAuthUrl(discordId, guildId);
  }

  async handleCallback(
    query: Record<string, string>,
  ): Promise<SteamLinkResult> {
    // return_to 에 실어 보낸 값이 그대로 돌아온다.
    const discordId = query.d;
    const guildId = query.g;
    if (!discordId || !guildId) {
      throw new BadRequestException('잘못된 인증 요청입니다.');
    }

    const steamId = await this.steamApiService.verifyCallback(query);
    const profile = await this.steamApiService.fetchProfile(steamId);

    const steam = await this.link(discordId, profile);
    const ownsPalworld = await this.syncPalworld(steam);

    this.logger.log(
      `스팀 연결 완료: discordId=${discordId} steamId=${steamId} ` +
        `팰월드 소유=${ownsPalworld}`,
    );

    this.eventEmitter.emit(
      STEAM_LINKED_EVENT,
      new SteamLinkedEvent(
        discordId,
        guildId,
        steamId,
        profile.personaName,
        ownsPalworld,
      ),
    );

    return { steam, ownsPalworld };
  }

  /** 연동을 해제한다. 세션·소켓 정리는 이벤트를 받는 쪽이 한다. */
  async unlink(discordId: string): Promise<Steam | null> {
    const user = await this.userRepository.findOne({ where: { discordId } });
    if (!user) return null;

    const steam = await this.steamRepository.findOne({
      where: { userId: user.id },
    });
    if (!steam) return null;

    // game_palworld 는 FK CASCADE 로 함께 지워진다.
    await this.steamRepository.remove(steam);
    this.logger.log(`스팀 연결 해제: discordId=${discordId}`);

    return steam;
  }

  private async link(discordId: string, profile: SteamProfile): Promise<Steam> {
    const user = await this.findOrCreateUser(discordId);

    const owner = await this.steamRepository.findOne({
      where: { steamId: profile.steamId },
    });
    if (owner && owner.userId !== user.id) {
      throw new BadRequestException(
        '이미 다른 Discord 계정에 연결된 Steam 계정입니다.',
      );
    }

    const existing = await this.steamRepository.findOne({
      where: { userId: user.id },
    });

    const steam =
      existing ??
      this.steamRepository.create({
        userId: user.id,
        steamId: profile.steamId,
      });

    steam.steamId = profile.steamId;
    steam.personaName = profile.personaName;

    return this.steamRepository.save(steam);
  }

  /** 팰월드 소유 여부를 조회해 game_palworld 에 반영한다. */
  private async syncPalworld(steam: Steam): Promise<boolean> {
    const owned = await this.steamApiService.ownsPalworld(steam.steamId);

    const existing = await this.palworldRepository.findOne({
      where: { steamRefId: steam.id },
    });

    const palworld =
      existing ?? this.palworldRepository.create({ steamRefId: steam.id });

    palworld.owned = owned;
    palworld.verifiedAt = new Date();
    await this.palworldRepository.save(palworld);

    return owned;
  }

  private async findOrCreateUser(discordId: string): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { discordId },
    });
    if (existing) return existing;

    return this.userRepository.save(this.userRepository.create({ discordId }));
  }
}
