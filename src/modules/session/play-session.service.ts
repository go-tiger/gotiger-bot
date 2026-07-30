import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PlaySession } from '../../common/entities/play-session.entity';
import { GameServer } from '../../common/entities/game-server.entity';
import {
  PLAY_SESSION_ENDED_EVENT,
  PLAY_SESSION_STARTED_EVENT,
  PlaySessionEndedEvent,
  PlaySessionStartedEvent,
} from '../../common/events/play-session.event';

export type SessionEndReason = PlaySessionEndedEvent['reason'];

/**
 * 스트리머가 어느 게임서버에 접속해 있는지를 관리한다.
 * 후원 라우팅의 유일한 근거이므로 이 상태가 정확해야 한다.
 *
 * 게임 종류와 무관하게 스트리머당 세션은 1개다.
 * 다른 서버에서 입장이 보고되면 최신 것으로 교체한다.
 */
@Injectable()
export class PlaySessionService {
  private readonly logger = new Logger(PlaySessionService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(PlaySession)
    private readonly sessionRepository: Repository<PlaySession>,
    @InjectRepository(GameServer)
    private readonly gameServerRepository: Repository<GameServer>,
  ) {}

  findActiveByUser(userId: number): Promise<PlaySession | null> {
    return this.sessionRepository.findOne({
      where: { userId, status: 'active' },
    });
  }

  /** 후원 라우팅에서 게임서버와 길드를 함께 얻기 위해 관계를 당겨온다. */
  findActiveWithServer(userId: number): Promise<PlaySession | null> {
    return this.sessionRepository.findOne({
      where: { userId, status: 'active' },
      relations: ['gameServer'],
    });
  }

  findActiveByServer(gameServerId: number): Promise<PlaySession[]> {
    return this.sessionRepository.find({
      where: { gameServerId, status: 'active' },
    });
  }

  findAllActive(): Promise<PlaySession[]> {
    return this.sessionRepository.find({
      where: { status: 'active' },
      relations: ['gameServer'],
    });
  }

  /**
   * 입장을 반영한다. 이미 같은 서버에 세션이 있으면 그대로 둔다.
   *
   * at 이 기존 세션의 시작 시각보다 이전이면 무시한다.
   * 퇴장 push 가 지연 도착해 순서가 뒤집히는 경우를 막는다.
   */
  async start(
    userId: number,
    gameServerId: number,
    at: Date,
  ): Promise<PlaySession | null> {
    const existing = await this.findActiveByUser(userId);

    if (existing) {
      if (existing.gameServerId === gameServerId) return existing;

      // 다른 서버에서 들어왔다. 늦게 도착한 보고라면 무시한다.
      if (at < existing.startedAt) {
        this.logger.warn(
          `순서가 뒤집힌 입장 보고 무시: userId=${userId} ` +
            `at=${at.toISOString()} < startedAt=${existing.startedAt.toISOString()}`,
        );
        return existing;
      }

      await this.close(existing, 'leave');
    }

    const gameServer = await this.gameServerRepository.findOne({
      where: { id: gameServerId },
    });
    if (!gameServer) return null;

    const session = await this.sessionRepository.save(
      this.sessionRepository.create({
        userId,
        gameServerId,
        status: 'active',
        startedAt: at,
      }),
    );

    this.logger.log(
      `세션 시작: userId=${userId} gameServerId=${gameServerId} ` +
        `guildId=${gameServer.guildId}`,
    );

    this.eventEmitter.emit(
      PLAY_SESSION_STARTED_EVENT,
      new PlaySessionStartedEvent(
        session.id,
        userId,
        gameServerId,
        gameServer.guildId,
      ),
    );

    return session;
  }

  /**
   * 퇴장을 반영한다.
   * at 이 세션 시작보다 이전이면 이미 재입장한 세션이므로 건드리지 않는다.
   */
  async end(
    userId: number,
    gameServerId: number,
    at: Date,
    reason: SessionEndReason = 'leave',
  ): Promise<void> {
    const session = await this.findActiveByUser(userId);
    if (!session || session.gameServerId !== gameServerId) return;

    if (at < session.startedAt) {
      this.logger.warn(
        `순서가 뒤집힌 퇴장 보고 무시: userId=${userId} ` +
          `at=${at.toISOString()} < startedAt=${session.startedAt.toISOString()}`,
      );
      return;
    }

    await this.close(session, reason);
  }

  /** 연동 해제·서버 삭제처럼 시각과 무관하게 즉시 닫아야 하는 경우. */
  async endByUser(userId: number, reason: SessionEndReason): Promise<void> {
    const session = await this.findActiveByUser(userId);
    if (!session) return;

    await this.close(session, reason);
  }

  async endByServer(
    gameServerId: number,
    reason: SessionEndReason,
  ): Promise<void> {
    const sessions = await this.findActiveByServer(gameServerId);

    for (const session of sessions) {
      await this.close(session, reason);
    }
  }

  /**
   * heartbeat 의 접속자 목록으로 세션을 맞춘다.
   * push 를 놓쳐도 최대 한 주기 뒤에 보정되므로 이쪽이 기준이다.
   *
   * 이 서버의 세션 중 목록에 없는 것만 닫는다. 다른 서버의 세션은
   * 그 서버의 heartbeat 가 관리하므로 건드리지 않는다.
   */
  async syncFromHeartbeat(
    gameServerId: number,
    userIds: number[],
    at: Date,
  ): Promise<void> {
    const present = new Set(userIds);
    const sessions = await this.findActiveByServer(gameServerId);

    for (const session of sessions) {
      if (!present.has(session.userId)) {
        await this.close(session, 'leave');
      }
    }

    const known = new Set(sessions.map((session) => session.userId));
    for (const userId of userIds) {
      if (!known.has(userId)) {
        await this.start(userId, gameServerId, at);
      }
    }
  }

  /** 만료 크론이 쓴다. 이미 닫힌 세션은 건너뛴다. */
  async expire(sessionIds: number[]): Promise<void> {
    if (sessionIds.length === 0) return;

    const sessions = await this.sessionRepository.find({
      where: { id: In(sessionIds), status: 'active' },
    });

    for (const session of sessions) {
      await this.close(session, 'expired');
    }
  }

  private async close(
    session: PlaySession,
    reason: SessionEndReason,
  ): Promise<void> {
    session.status = 'ended';
    session.endedAt = new Date();
    await this.sessionRepository.save(session);

    this.logger.log(
      `세션 종료: userId=${session.userId} ` +
        `gameServerId=${session.gameServerId} reason=${reason}`,
    );

    this.eventEmitter.emit(
      PLAY_SESSION_ENDED_EVENT,
      new PlaySessionEndedEvent(
        session.id,
        session.userId,
        session.gameServerId,
        reason,
      ),
    );
  }
}
