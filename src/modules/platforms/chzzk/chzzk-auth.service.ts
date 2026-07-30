import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User } from '../../../common/entities/user.entity';
import { PlatformChzzk } from '../../../common/entities/platform-chzzk.entity';
import {
  CHZZK_LINKED_EVENT,
  ChzzkLinkedEvent,
} from '../../../common/events/chzzk-linked.event';
import {
  CHZZK_TOKEN_REFRESHED_EVENT,
  ChzzkTokenRefreshedEvent,
} from '../../../common/events/chzzk-token-refreshed.event';
import {
  ChzzkApiService,
  type ChzzkChannel,
  type ChzzkToken,
} from './chzzk-api.service';

/** 만료 이 시간 전이면 갱신 대상으로 본다. */
const REFRESH_MARGIN_HOURS = 2;

@Injectable()
export class ChzzkAuthService {
  private readonly logger = new Logger(ChzzkAuthService.name);

  constructor(
    private readonly chzzkApiService: ChzzkApiService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PlatformChzzk)
    private readonly chzzkRepository: Repository<PlatformChzzk>,
  ) {}

  createAuthUrl(discordId: string, guildId: string): string {
    return this.chzzkApiService.buildAuthUrl(
      ChzzkAuthService.encodeState(discordId, guildId),
    );
  }

  async handleCallback(code: string, state: string): Promise<PlatformChzzk> {
    const [discordId, guildId] = ChzzkAuthService.decodeState(state);
    if (!discordId || !guildId) {
      throw new BadRequestException('잘못된 인증 요청입니다.');
    }

    const token = await this.chzzkApiService.issueToken(code, state);
    const channel = await this.chzzkApiService.fetchChannel(
      token.tokenType,
      token.accessToken,
    );

    const chzzk = await this.link(discordId, channel, token);
    this.logger.log(
      `치지직 연결 완료: discordId=${discordId} channel=${channel.channelName} ` +
        `만료=${chzzk.expiresAt.toISOString()}`,
    );

    this.eventEmitter.emit(
      CHZZK_LINKED_EVENT,
      new ChzzkLinkedEvent(
        discordId,
        guildId,
        channel.channelId,
        channel.channelName,
      ),
    );

    return chzzk;
  }

  /**
   * 만료가 임박한 토큰을 갱신한다.
   * 소켓은 게임 접속 중에만 열리지만 토큰은 항상 유효해야
   * 세션이 열릴 때 바로 연결할 수 있다.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async refreshExpiringTokens(): Promise<void> {
    const threshold = new Date();
    threshold.setHours(threshold.getHours() + REFRESH_MARGIN_HOURS);

    const expiring = await this.chzzkRepository.find({
      where: { expiresAt: LessThanOrEqual(threshold) },
    });

    // 대상이 없어도 남긴다. 로그가 없으면 크론이 도는지조차 알 수 없다.
    this.logger.log(`치지직 토큰 갱신 대상 ${expiring.length}건`);
    if (expiring.length === 0) return;

    for (const chzzk of expiring) {
      try {
        const token = await this.chzzkApiService.refreshToken(
          chzzk.refreshToken,
        );
        this.applyToken(chzzk, token);
        await this.chzzkRepository.save(chzzk);

        this.logger.log(
          `치지직 토큰 갱신 완료: channel=${chzzk.channelName} ` +
            `만료=${chzzk.expiresAt.toISOString()}`,
        );

        // 열려 있는 세션은 옛 토큰으로 연결돼 있으므로 새 토큰으로 다시 연결한다.
        this.eventEmitter.emit(
          CHZZK_TOKEN_REFRESHED_EVENT,
          new ChzzkTokenRefreshedEvent(chzzk.channelId),
        );
      } catch (error) {
        // 한 건이 실패해도 나머지는 계속 갱신한다.
        this.logger.error(
          `치지직 토큰 갱신 실패: channelId=${chzzk.channelId}`,
          error,
        );
      }
    }
  }

  /** 연동을 해제한다. 세션·소켓 정리는 이벤트를 받는 쪽이 한다. */
  async unlink(discordId: string): Promise<PlatformChzzk | null> {
    const user = await this.userRepository.findOne({ where: { discordId } });
    if (!user) return null;

    const chzzk = await this.chzzkRepository.findOne({
      where: { userId: user.id },
    });
    if (!chzzk) return null;

    await this.chzzkRepository.remove(chzzk);
    this.logger.log(`치지직 연결 해제: discordId=${discordId}`);

    return chzzk;
  }

  /**
   * 치지직 state 는 인가 요청과 토큰 요청에서 값이 정확히 일치해야 한다.
   * 콜론 같은 특수문자가 섞이면 전달 과정에서 어긋날 수 있어 영숫자만 쓴다.
   * Discord 스노플레이크는 숫자뿐이므로 'd' 를 구분자로 삼는다.
   */
  private static encodeState(discordId: string, guildId: string): string {
    return `${discordId}d${guildId}`;
  }

  private static decodeState(state: string): [string?, string?] {
    const [discordId, guildId] = state.split('d');

    return [discordId, guildId];
  }

  private async link(
    discordId: string,
    channel: ChzzkChannel,
    token: ChzzkToken,
  ): Promise<PlatformChzzk> {
    const user = await this.findOrCreateUser(discordId);

    const owner = await this.chzzkRepository.findOne({
      where: { channelId: channel.channelId },
    });
    if (owner && owner.userId !== user.id) {
      throw new BadRequestException(
        '이미 다른 Discord 계정에 연결된 치지직 채널입니다.',
      );
    }

    const existing = await this.chzzkRepository.findOne({
      where: { userId: user.id },
    });

    const chzzk =
      existing ??
      this.chzzkRepository.create({
        userId: user.id,
        channelId: channel.channelId,
      });

    chzzk.channelId = channel.channelId;
    chzzk.channelName = channel.channelName;
    this.applyToken(chzzk, token);

    return this.chzzkRepository.save(chzzk);
  }

  private applyToken(chzzk: PlatformChzzk, token: ChzzkToken): void {
    chzzk.accessToken = token.accessToken;
    chzzk.refreshToken = token.refreshToken;
    chzzk.tokenType = token.tokenType;
    chzzk.scope = token.scope;
    chzzk.expiresAt = new Date(Date.now() + token.expiresIn * 1000);
  }

  private async findOrCreateUser(discordId: string): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { discordId },
    });
    if (existing) return existing;

    return this.userRepository.save(this.userRepository.create({ discordId }));
  }
}
