import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Steam } from '../../../common/entities/steam.entity';
import { PlaySessionService } from '../../session/play-session.service';

/**
 * 팰월드 모드가 보내는 SteamID64 를 봇의 User 로 옮긴다.
 *
 * 연동하지 않은 일반 플레이어가 대부분이므로, 매칭되지 않는 값은
 * 로그도 남기지 않고 조용히 버린다.
 */
@Injectable()
export class PalworldSessionService {
  private readonly logger = new Logger(PalworldSessionService.name);

  constructor(
    private readonly playSessionService: PlaySessionService,
    @InjectRepository(Steam)
    private readonly steamRepository: Repository<Steam>,
  ) {}

  async handleJoin(
    gameServerId: number,
    steamId: string,
    at: Date,
  ): Promise<void> {
    const userId = await this.resolveUserId(steamId);
    if (!userId) return;

    await this.playSessionService.start(userId, gameServerId, at);
  }

  async handleLeave(
    gameServerId: number,
    steamId: string,
    at: Date,
  ): Promise<void> {
    const userId = await this.resolveUserId(steamId);
    if (!userId) return;

    await this.playSessionService.end(userId, gameServerId, at, 'leave');
  }

  /**
   * 접속자 전체 목록으로 세션을 맞춘다.
   * 연동된 스트리머만 걸러 넘기므로, 목록에 없는 세션은 정리된다.
   */
  async handleHeartbeat(
    gameServerId: number,
    steamIds: string[],
    at: Date,
  ): Promise<void> {
    const userIds = await this.resolveUserIds(steamIds);

    await this.playSessionService.syncFromHeartbeat(gameServerId, userIds, at);
  }

  private async resolveUserId(steamId: string): Promise<number | null> {
    const steam = await this.steamRepository.findOne({ where: { steamId } });

    return steam?.userId ?? null;
  }

  private async resolveUserIds(steamIds: string[]): Promise<number[]> {
    if (steamIds.length === 0) return [];

    const steams = await this.steamRepository.find({
      where: { steamId: In(steamIds) },
    });

    return steams.map((steam) => steam.userId);
  }
}
