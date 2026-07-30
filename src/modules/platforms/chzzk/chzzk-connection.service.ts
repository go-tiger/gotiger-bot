import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// 치지직 세션 서버는 Socket.IO v2 이므로 클라이언트도 2.x 를 써야 한다.
import io from 'socket.io-client';
import { PlatformChzzk } from '../../../common/entities/platform-chzzk.entity';
import {
  CHZZK_DONATION_EVENT,
  ChzzkDonationEvent,
} from '../../../common/events/chzzk-donation.event';
import {
  CHZZK_TOKEN_REFRESHED_EVENT,
  ChzzkTokenRefreshedEvent,
} from '../../../common/events/chzzk-token-refreshed.event';
import { ChzzkApiService } from './chzzk-api.service';

/** 문서에 명시된 연결 옵션. 재연결은 직접 관리한다. */
const SOCKET_OPTIONS: SocketIOClient.ConnectOpts = {
  reconnection: false,
  forceNew: true,
  timeout: 3000,
  transports: ['websocket'],
};

/**
 * 세션이 닫혀도 이 시간 동안은 소켓을 유지한다.
 * 입·퇴장이 잦을 때 치지직 세션 발급을 매번 호출하지 않기 위함이다.
 */
const LINGER_MS = 300_000;

/** 지수 백오프 간격. 세션이 살아 있는 한 마지막 값으로 계속 재시도한다. */
const BACKOFF_MS = [5_000, 10_000, 30_000, 60_000];

interface SystemMessage {
  type: string;
  data?: { sessionKey?: string };
}

interface DonationMessage {
  channelId?: string;
  donatorNickname?: string;
  /** 문서에는 String 이지만 실제로는 숫자로 온다. */
  payAmount?: number | string;
  donationText?: string;
  donationType?: string;
  /** 문서에 없지만 실제로 오는 필드. 치지직이 이벤트를 보낸 시각. */
  eventSentAt?: string;
}

interface Connection {
  socket: SocketIOClient.Socket | null;
  /** 세션이 닫힌 뒤 소켓을 끊을 타이머. 재입장하면 취소한다. */
  lingerTimer?: NodeJS.Timeout;
  /** 재연결 대기 타이머. */
  retryTimer?: NodeJS.Timeout;
  retryCount: number;
  /** 세션이 열려 있는지. 재연결 여부를 이 값으로 판단한다. */
  active: boolean;
}

/**
 * 채널별로 후원 수신 소켓을 관리한다.
 *
 * 소켓은 스트리머가 게임서버에 접속해 있을 때만 열린다.
 * 연동만 해두면 열리지 않는다. 치지직은 유저당 동시 연결이 3개로
 * 제한되므로 채널당 하나만 두고, 재연결 시 이전 소켓을 먼저 끊는다.
 */
@Injectable()
export class ChzzkConnectionService implements OnApplicationShutdown {
  private readonly logger = new Logger(ChzzkConnectionService.name);
  private readonly connections = new Map<string, Connection>();

  constructor(
    private readonly chzzkApiService: ChzzkApiService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(PlatformChzzk)
    private readonly chzzkRepository: Repository<PlatformChzzk>,
  ) {}

  /** 세션이 열렸다. 유예 중인 소켓이 있으면 그대로 재사용한다. */
  async open(userId: number): Promise<void> {
    const chzzk = await this.findByUser(userId);
    if (!chzzk) return;

    const existing = this.connections.get(chzzk.channelId);
    if (existing) {
      existing.active = true;
      this.clearLinger(existing);

      // 이미 붙어 있으면 다시 발급받을 이유가 없다.
      if (existing.socket?.connected) return;
    }

    await this.connect(chzzk);
  }

  /** 세션이 닫혔다. 곧바로 끊지 않고 유예를 둔다. */
  async close(userId: number, immediate = false): Promise<void> {
    const chzzk = await this.findByUser(userId);
    if (!chzzk) return;

    this.closeByChannel(chzzk.channelId, immediate);
  }

  closeByChannel(channelId: string, immediate = false): void {
    const connection = this.connections.get(channelId);
    if (!connection) return;

    connection.active = false;
    this.clearRetry(connection);

    if (immediate) {
      this.disconnect(channelId);
      return;
    }

    this.clearLinger(connection);
    connection.lingerTimer = setTimeout(() => {
      // 유예 중 재입장했다면 active 가 다시 true 다.
      if (!connection.active) this.disconnect(channelId);
    }, LINGER_MS);
  }

  /** 토큰이 갱신되면 기존 소켓은 옛 토큰으로 열려 있으므로 다시 연결한다. */
  @OnEvent(CHZZK_TOKEN_REFRESHED_EVENT)
  async onTokenRefreshed(event: ChzzkTokenRefreshedEvent): Promise<void> {
    const connection = this.connections.get(event.channelId);
    if (!connection?.active) return;

    const chzzk = await this.chzzkRepository.findOne({
      where: { channelId: event.channelId },
      relations: ['user'],
    });
    if (!chzzk) return;

    await this.connect(chzzk);
  }

  onApplicationShutdown(): void {
    for (const channelId of [...this.connections.keys()]) {
      this.disconnect(channelId);
    }
  }

  private async connect(chzzk: PlatformChzzk): Promise<void> {
    // 같은 채널의 이전 소켓을 남기면 동시 연결 제한에 걸린다.
    this.detachSocket(chzzk.channelId);

    const connection = this.ensureConnection(chzzk.channelId);
    connection.active = true;

    try {
      const url = await this.chzzkApiService.createUserSession(
        chzzk.tokenType,
        chzzk.accessToken,
      );

      const socket = io(url, SOCKET_OPTIONS);
      connection.socket = socket;
      connection.retryCount = 0;
      this.bind(socket, chzzk);
    } catch (error) {
      this.logger.error(
        `치지직 세션 연결 실패: channel=${chzzk.channelName}`,
        error,
      );
      this.scheduleRetry(chzzk);
    }
  }

  private bind(socket: SocketIOClient.Socket, chzzk: PlatformChzzk): void {
    socket.on('connect', () => {
      this.logger.log(`치지직 세션 접속: channel=${chzzk.channelName}`);
    });

    // 연결 직후 SYSTEM/connected 로 sessionKey 가 오면 그때 구독한다.
    socket.on('SYSTEM', (raw: unknown) => {
      void this.handleSystem(raw, chzzk);
    });

    socket.on('DONATION', (raw: unknown) => {
      this.handleDonation(raw, chzzk);
    });

    socket.on('disconnect', (reason: string) => {
      this.logger.warn(
        `치지직 세션 끊김: channel=${chzzk.channelName} reason=${reason}`,
      );

      const connection = this.connections.get(chzzk.channelId);
      if (!connection) return;

      connection.socket = null;
      // 세션이 살아 있으면 복구를 시도한다. 닫혔으면 그대로 둔다.
      if (connection.active) this.scheduleRetry(chzzk);
    });

    socket.on('connect_error', (error: Error) => {
      this.logger.error(
        `치지직 세션 접속 오류: channel=${chzzk.channelName}`,
        error.message,
      );
    });
  }

  /**
   * 세션이 살아 있는 한 재시도를 포기하지 않는다.
   * 스트리머가 게임 중이면 후원이 유실되므로 복구가 우선이다.
   */
  private scheduleRetry(chzzk: PlatformChzzk): void {
    const connection = this.ensureConnection(chzzk.channelId);
    if (!connection.active) return;

    this.clearRetry(connection);

    const delay =
      BACKOFF_MS[Math.min(connection.retryCount, BACKOFF_MS.length - 1)];
    connection.retryCount += 1;

    this.logger.log(
      `치지직 재연결 예약: channel=${chzzk.channelName} ` +
        `${delay / 1000}초 후 (${connection.retryCount}회)`,
    );

    connection.retryTimer = setTimeout(() => {
      if (!connection.active) return;
      void this.connect(chzzk);
    }, delay);
  }

  private async handleSystem(
    raw: unknown,
    chzzk: PlatformChzzk,
  ): Promise<void> {
    const message = this.parse<SystemMessage>(raw);
    if (message?.type !== 'connected') return;

    const sessionKey = message.data?.sessionKey;
    if (!sessionKey) {
      this.logger.error(`치지직 sessionKey 누락: channel=${chzzk.channelName}`);
      return;
    }

    try {
      await this.chzzkApiService.subscribeDonation(
        chzzk.tokenType,
        chzzk.accessToken,
        sessionKey,
      );
      this.logger.log(`치지직 후원 구독 완료: channel=${chzzk.channelName}`);
    } catch (error) {
      this.logger.error(
        `치지직 후원 구독 실패: channel=${chzzk.channelName}`,
        error,
      );
    }
  }

  private handleDonation(raw: unknown, chzzk: PlatformChzzk): void {
    const message = this.parse<DonationMessage>(raw);
    if (!message) return;

    this.eventEmitter.emit(
      CHZZK_DONATION_EVENT,
      new ChzzkDonationEvent(
        message.channelId ?? chzzk.channelId,
        chzzk.channelName,
        chzzk.userId,
        chzzk.user?.discordId ?? null,
        message.donatorNickname ?? '익명',
        Number(message.payAmount ?? 0),
        message.donationText ?? '',
        message.donationType ?? 'CHAT',
        this.parseSentAt(message.eventSentAt),
      ),
    );
  }

  /**
   * eventSentAt 은 '2026-07-29T15:12:30.442023260' 처럼
   * 나노초 정밀도에 타임존이 없는 형태로 온다. Date 가 파싱하지 못하므로
   * 밀리초까지만 잘라 KST 로 해석한다. 실패하면 수신 시각으로 대체한다.
   */
  private parseSentAt(eventSentAt?: string): Date {
    if (!eventSentAt) return new Date();

    const trimmed = eventSentAt.replace(
      /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3})\d*)?$/,
      (_, head: string, millis?: string) =>
        `${head}.${(millis ?? '0').padEnd(3, '0')}+09:00`,
    );

    const parsed = new Date(trimmed);

    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  /** 페이로드가 문자열로 오는 경우가 있어 양쪽을 모두 받는다. */
  private parse<T>(raw: unknown): T | null {
    if (typeof raw === 'object' && raw !== null) return raw as T;

    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as T;
      } catch {
        this.logger.warn(`치지직 메시지 파싱 실패: ${raw.slice(0, 200)}`);
      }
    }

    return null;
  }

  private ensureConnection(channelId: string): Connection {
    const existing = this.connections.get(channelId);
    if (existing) return existing;

    const created: Connection = {
      socket: null,
      retryCount: 0,
      active: false,
    };
    this.connections.set(channelId, created);

    return created;
  }

  /** 소켓만 떼어낸다. 타이머와 상태는 유지한다. */
  private detachSocket(channelId: string): void {
    const connection = this.connections.get(channelId);
    if (!connection?.socket) return;

    connection.socket.removeAllListeners();
    connection.socket.disconnect();
    connection.socket = null;
  }

  private disconnect(channelId: string): void {
    const connection = this.connections.get(channelId);
    if (!connection) return;

    this.clearLinger(connection);
    this.clearRetry(connection);
    this.detachSocket(channelId);
    this.connections.delete(channelId);

    this.logger.log(`치지직 세션 종료: channelId=${channelId}`);
  }

  private clearLinger(connection: Connection): void {
    if (!connection.lingerTimer) return;

    clearTimeout(connection.lingerTimer);
    connection.lingerTimer = undefined;
  }

  private clearRetry(connection: Connection): void {
    if (!connection.retryTimer) return;

    clearTimeout(connection.retryTimer);
    connection.retryTimer = undefined;
  }

  private findByUser(userId: number): Promise<PlatformChzzk | null> {
    // 후원 알림에서 스트리머를 멘션하려면 user 가 함께 필요하다.
    return this.chzzkRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }
}
