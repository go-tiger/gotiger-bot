import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  CHZZK_DONATION_EVENT,
  ChzzkDonationEvent,
} from '../../common/events/chzzk-donation.event';
import {
  DONATION_ROUTED_EVENT,
  DonationRoutedEvent,
  type DonationRouteOutcome,
} from '../../common/events/donation-routed.event';
import { GameServerAdapterRegistry } from '../../common/registries/game-server-adapter.registry';
import { PlaySessionService } from '../session/play-session.service';

/**
 * 후원을 스트리머가 접속 중인 게임서버로 보낸다.
 *
 * 봇의 역할은 여기서 끝난다. 금액에 따라 무엇을 할지는 게임서버가 판단한다.
 * 전달에 실패해도 재시도하지 않는다 — 다음 heartbeat 가 상태를 정리한다.
 */
@Injectable()
export class DonationRouterService {
  private readonly logger = new Logger(DonationRouterService.name);

  constructor(
    private readonly playSessionService: PlaySessionService,
    private readonly adapterRegistry: GameServerAdapterRegistry,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(CHZZK_DONATION_EVENT)
  async onChzzkDonation(event: ChzzkDonationEvent): Promise<void> {
    await this.route(event, 'chzzk');
  }

  private async route(
    event: ChzzkDonationEvent,
    platform: string,
  ): Promise<void> {
    const session = await this.playSessionService.findActiveWithServer(
      event.userId,
    );

    // 유예 중인 소켓으로 들어온 후원. 보낼 곳이 없으므로 버린다.
    if (!session?.gameServer) {
      this.logger.log(
        `활성 세션이 없어 후원을 버림: channel=${event.channelName} ` +
          `금액=${event.payAmount}`,
      );
      this.publish(event, 'no-session', null, null, null);
      return;
    }

    const { gameServer } = session;
    const adapter = this.adapterRegistry.find(gameServer.game);
    if (!adapter) {
      this.logger.warn(
        `어댑터가 없는 게임의 세션: game=${gameServer.game} ` +
          `gameServerId=${gameServer.id}`,
      );
      this.publish(
        event,
        'no-adapter',
        gameServer.guildId,
        gameServer.name,
        null,
      );
      return;
    }

    const playerId = await adapter.resolvePlayerId(event.userId);
    if (!playerId) {
      // 세션이 열렸다면 계정이 있어야 한다. 연동 해제 직후라면 가능하다.
      this.publish(
        event,
        'failed',
        gameServer.guildId,
        gameServer.name,
        '게임 계정 연동을 찾을 수 없습니다.',
      );
      return;
    }

    const result = await adapter.deliverDonation(gameServer.id, {
      playerId,
      streamerName: event.channelName,
      platform,
      donationType: event.donationType,
      amount: event.payAmount,
      message: event.donationText,
      donorName: event.donatorNickname,
      donatedAt: event.sentAt,
    });

    if (result.status === 'delivered') {
      this.logger.log(
        `후원 전달 완료: channel=${event.channelName} ` +
          `server=${gameServer.name} 금액=${event.payAmount}`,
      );
      this.publish(
        event,
        'delivered',
        gameServer.guildId,
        gameServer.name,
        null,
      );
      return;
    }

    if (result.status === 'player-absent') {
      // 게임서버가 '그 플레이어 없다'고 답했다. 세션이 어긋났으므로 닫는다.
      this.logger.warn(
        `플레이어 미접속으로 세션 종료: userId=${event.userId} ` +
          `gameServerId=${gameServer.id}`,
      );
      await this.playSessionService.endByUser(event.userId, 'expired');
      this.publish(
        event,
        'player-absent',
        gameServer.guildId,
        gameServer.name,
        null,
      );
      return;
    }

    // 그 외 실패는 세션을 유지한다. 일시적 오류일 수 있다.
    this.publish(
      event,
      'failed',
      gameServer.guildId,
      gameServer.name,
      result.reason,
    );
  }

  private publish(
    event: ChzzkDonationEvent,
    outcome: DonationRouteOutcome,
    guildId: string | null,
    serverName: string | null,
    failureReason: string | null,
  ): void {
    this.eventEmitter.emit(
      DONATION_ROUTED_EVENT,
      new DonationRoutedEvent(
        outcome,
        guildId,
        event.channelName,
        event.streamerDiscordId,
        event.donatorNickname,
        event.payAmount,
        event.donationText,
        event.donationType,
        event.sentAt,
        serverName,
        failureReason,
      ),
    );
  }
}
