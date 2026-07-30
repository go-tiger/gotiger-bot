import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GamePalworldServer } from '../../common/entities/game-palworld-server.entity';
import { PlaySessionService } from './play-session.service';

/** 이 시간 동안 heartbeat 가 없으면 게임서버가 죽은 것으로 본다. */
const HEARTBEAT_TIMEOUT_MS = 180_000;

/**
 * 부팅 직후에는 아직 heartbeat 를 받은 적이 없다.
 * 배포에 시간이 걸리면 마지막 수신 시각이 이미 만료 기준을 넘었을 수 있어,
 * 살아 있는 세션을 죽이지 않도록 이 시간만큼 판정을 미룬다.
 */
const BOOT_GRACE_MS = 180_000;

/**
 * heartbeat 가 끊긴 게임서버의 세션을 정리한다.
 *
 * 모드는 팰월드 REST API 조회에 실패한 주기에는 아무것도 보내지 않는다.
 * 따라서 heartbeat 공백은 곧 게임서버가 응답하지 않는다는 뜻이다.
 */
@Injectable()
export class SessionExpiryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SessionExpiryService.name);
  private graceUntil = 0;

  constructor(
    private readonly playSessionService: PlaySessionService,
    @InjectRepository(GamePalworldServer)
    private readonly palworldServerRepository: Repository<GamePalworldServer>,
  ) {}

  onApplicationBootstrap(): void {
    this.graceUntil = Date.now() + BOOT_GRACE_MS;
    this.logger.log(
      `세션 만료 판정 유예 ${BOOT_GRACE_MS / 1000}초 (부팅 직후)`,
    );
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async expireStaleSessions(): Promise<void> {
    if (Date.now() < this.graceUntil) return;

    const stale = await this.findStaleServerIds();
    if (stale.length === 0) return;

    for (const gameServerId of stale) {
      const sessions =
        await this.playSessionService.findActiveByServer(gameServerId);
      if (sessions.length === 0) continue;

      this.logger.warn(
        `heartbeat 만료로 세션 정리: gameServerId=${gameServerId} ` +
          `${sessions.length}건`,
      );

      await this.playSessionService.expire(
        sessions.map((session) => session.id),
      );
    }
  }

  /**
   * heartbeat 가 끊긴 팰월드 서버를 찾는다.
   * 한 번도 받은 적 없는 서버(lastHeartbeatAt = null)는 애초에
   * 세션이 열릴 수 없으므로 대상에서 빠진다.
   */
  private async findStaleServerIds(): Promise<number[]> {
    const threshold = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);

    const servers = await this.palworldServerRepository
      .createQueryBuilder('server')
      .select('server.gameServerId', 'gameServerId')
      .where('server.lastHeartbeatAt IS NOT NULL')
      .andWhere('server.lastHeartbeatAt < :threshold', { threshold })
      .getRawMany<{ gameServerId: number }>();

    return servers.map((server) => server.gameServerId);
  }
}
