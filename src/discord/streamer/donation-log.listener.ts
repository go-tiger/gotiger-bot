import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChannelManager, EmbedBuilder } from 'discord.js';
import { GuildChannelService } from '../../modules/guild/services/guild-channel.service';
import {
  DONATION_ROUTED_EVENT,
  DonationRoutedEvent,
  type DonationRouteOutcome,
} from '../../common/events/donation-routed.event';

/** 치지직 후원 유형별 표시. 문서상 CHAT 과 VIDEO 두 가지다. */
const DONATION_KINDS: Record<string, { emoji: string; label: string }> = {
  CHAT: { emoji: '💰', label: '채팅 후원' },
  VIDEO: { emoji: '🎬', label: '영상 후원' },
};

const OUTCOMES: Record<DonationRouteOutcome, { text: string; color: number }> =
  {
    delivered: { text: '✅ 게임서버로 전달', color: 0x57f287 },
    'player-absent': {
      text: '⚠️ 플레이어 미접속 — 세션을 종료했습니다',
      color: 0xfaa61a,
    },
    failed: { text: '❌ 전달 실패', color: 0xed4245 },
    'no-session': { text: '⏸️ 접속 중인 게임서버 없음', color: 0x99aab5 },
    'no-adapter': { text: '❌ 지원하지 않는 게임', color: 0xed4245 },
  };

/**
 * 후원 라우팅 결과를 로그 채널에 남긴다.
 * 성공·실패를 모두 남겨 서버장이 동작을 눈으로 확인할 수 있게 한다.
 */
@Injectable()
export class DonationLogListener {
  private readonly logger = new Logger(DonationLogListener.name);

  constructor(
    private readonly channels: ChannelManager,
    private readonly guildChannelService: GuildChannelService,
  ) {}

  @OnEvent(DONATION_ROUTED_EVENT)
  async onRouted(event: DonationRoutedEvent): Promise<void> {
    // 세션이 없으면 어느 길드에 게시할지 알 수 없다. 앱 로그에만 남는다.
    if (!event.guildId) return;

    try {
      const logChannelId = await this.guildChannelService.findChannelId(
        event.guildId,
        'palworld',
        'log',
      );
      if (!logChannelId) return;

      const channel = await this.channels.fetch(logChannelId);
      if (!channel?.isSendable()) return;

      await channel.send({ embeds: [this.buildEmbed(event)] });
    } catch (error) {
      this.logger.error('후원 로그 게시 실패', error);
    }
  }

  private buildEmbed(event: DonationRoutedEvent): EmbedBuilder {
    const kind = DONATION_KINDS[event.donationType] ?? DONATION_KINDS.CHAT;
    const outcome = OUTCOMES[event.outcome];

    const embed = new EmbedBuilder()
      .setTitle(`${kind.emoji} ${kind.label}`)
      .setColor(outcome.color)
      // 후원자·금액은 한 줄에 나란히, 나머지는 아래로 둔다.
      .addFields(
        { name: '후원자', value: event.donatorNickname, inline: true },
        {
          name: '금액',
          value: `${event.payAmount.toLocaleString('ko-KR')}원`,
          inline: true,
        },
        { name: '채널', value: this.formatChannel(event), inline: true },
        { name: '전달 결과', value: this.formatOutcome(event, outcome.text) },
      )
      // 수신 시각이 아니라 치지직이 이벤트를 보낸 시각을 쓴다.
      .setTimestamp(event.sentAt);

    if (event.donationText) {
      embed.setDescription(event.donationText);
    }

    return embed;
  }

  private formatChannel(event: DonationRoutedEvent): string {
    const lines = [event.channelName];

    // 임베드 안의 멘션은 링크로만 보이고 알림은 울리지 않는다.
    if (event.streamerDiscordId) {
      lines.push(`<@${event.streamerDiscordId}>`);
    }

    return lines.join('\n');
  }

  private formatOutcome(event: DonationRoutedEvent, text: string): string {
    const lines = [text];

    if (event.serverName) {
      lines.push(`서버: ${event.serverName}`);
    }
    if (event.failureReason) {
      lines.push(`사유: ${event.failureReason}`);
    }

    return lines.join('\n');
  }
}
