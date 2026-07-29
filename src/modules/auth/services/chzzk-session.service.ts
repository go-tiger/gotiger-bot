import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// 치지직 세션 서버는 Socket.IO v2 이므로 클라이언트도 2.x 를 써야 한다.
import io from 'socket.io-client';
import { Chzzk } from '../../../common/entities/chzzk.entity';
import {
  CHZZK_DONATION_EVENT,
  ChzzkDonationEvent,
} from '../../../common/events/chzzk-donation.event';
import {
  CHZZK_LINKED_EVENT,
  ChzzkLinkedEvent,
} from '../../../common/events/chzzk-linked.event';
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

/**
 * 연결된 치지직 채널마다 소켓 세션을 유지하고 후원 이벤트를 받는다.
 * 유저당 동시 연결이 3개로 제한되므로 채널당 하나만 연다.
 */
@Injectable()
export class ChzzkSessionService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(ChzzkSessionService.name);
  private readonly sockets = new Map<string, SocketIOClient.Socket>();

  constructor(
    private readonly chzzkApiService: ChzzkApiService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Chzzk)
    private readonly chzzkRepository: Repository<Chzzk>,
  ) {}

  /** 봇이 재시작해도 기존 연결이 복구되도록 부팅 시 전부 다시 연결한다. */
  async onModuleInit(): Promise<void> {
    // 후원 알림에서 스트리머를 멘션하려면 user 가 함께 필요하다.
    const linked = await this.chzzkRepository.find({ relations: ['user'] });
    if (linked.length === 0) return;

    this.logger.log(`치지직 세션 복구 대상 ${linked.length}건`);

    for (const chzzk of linked) {
      await this.connect(chzzk);
    }
  }

  /** 새로 연결한 채널은 즉시 세션을 연다. */
  @OnEvent(CHZZK_LINKED_EVENT)
  async onLinked(event: ChzzkLinkedEvent): Promise<void> {
    const chzzk = await this.chzzkRepository.findOne({
      where: { channelId: event.channelId },
      relations: ['user'],
    });
    if (!chzzk) return;

    await this.connect(chzzk);
  }

  /** 토큰이 갱신되면 기존 세션은 옛 토큰으로 열려 있으므로 다시 연결한다. */
  @OnEvent(CHZZK_TOKEN_REFRESHED_EVENT)
  async onTokenRefreshed(event: ChzzkTokenRefreshedEvent): Promise<void> {
    const chzzk = await this.chzzkRepository.findOne({
      where: { channelId: event.channelId },
      relations: ['user'],
    });
    if (!chzzk) return;

    await this.connect(chzzk);
  }

  onApplicationShutdown(): void {
    for (const [channelId, socket] of this.sockets) {
      socket.disconnect();
      this.logger.log(`치지직 세션 종료: channelId=${channelId}`);
    }
    this.sockets.clear();
  }

  /**
   * 세션을 발급받아 소켓에 접속하고 후원 이벤트를 구독한다.
   * 이미 열린 연결이 있으면 정리한 뒤 다시 연결한다.
   */
  async connect(chzzk: Chzzk): Promise<void> {
    this.disconnect(chzzk.channelId);

    try {
      const url = await this.chzzkApiService.createUserSession(
        chzzk.tokenType,
        chzzk.accessToken,
      );

      const socket = io(url, SOCKET_OPTIONS);
      this.sockets.set(chzzk.channelId, socket);
      this.bind(socket, chzzk);
    } catch (error) {
      this.logger.error(
        `치지직 세션 연결 실패: channel=${chzzk.channelName}`,
        error,
      );
    }
  }

  disconnect(channelId: string): void {
    const socket = this.sockets.get(channelId);
    if (!socket) return;

    socket.disconnect();
    this.sockets.delete(channelId);
  }

  private bind(socket: SocketIOClient.Socket, chzzk: Chzzk): void {
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
      this.sockets.delete(chzzk.channelId);
    });

    socket.on('connect_error', (error: Error) => {
      this.logger.error(
        `치지직 세션 접속 오류: channel=${chzzk.channelName}`,
        error.message,
      );
    });
  }

  private async handleSystem(raw: unknown, chzzk: Chzzk): Promise<void> {
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

  private handleDonation(raw: unknown, chzzk: Chzzk): void {
    const message = this.parse<DonationMessage>(raw);
    if (!message) return;

    // 길드를 모르면 어디에 게시할지 알 수 없다. 재연결하면 채워진다.
    if (!chzzk.guildId) {
      this.logger.warn(
        `후원 이벤트를 게시할 서버를 알 수 없음: channel=${chzzk.channelName}`,
      );
      return;
    }

    this.eventEmitter.emit(
      CHZZK_DONATION_EVENT,
      new ChzzkDonationEvent(
        message.channelId ?? chzzk.channelId,
        chzzk.guildId,
        chzzk.channelName,
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
}
