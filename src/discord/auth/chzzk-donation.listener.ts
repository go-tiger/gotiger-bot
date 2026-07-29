import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChannelManager, EmbedBuilder } from 'discord.js';
import { GuildChannelService } from '../../modules/guild/services/guild-channel.service';
import { GuildServiceConfigService } from '../../modules/guild/services/guild-service-config.service';
import {
  CHZZK_DONATION_EVENT,
  ChzzkDonationEvent,
} from '../../common/events/chzzk-donation.event';

/** 치지직 후원 유형별 표시. 문서상 CHAT 과 VIDEO 두 가지다. */
const DONATION_KINDS: Record<
  string,
  { emoji: string; label: string; color: number }
> = {
  CHAT: { emoji: '💰', label: '채팅 후원', color: 0x00ffa3 },
  VIDEO: { emoji: '🎬', label: '영상 후원', color: 0xffa500 },
};

@Injectable()
export class ChzzkDonationListener {
  private readonly logger = new Logger(ChzzkDonationListener.name);

  constructor(
    private readonly channels: ChannelManager,
    private readonly guildChannelService: GuildChannelService,
    private readonly guildServiceConfigService: GuildServiceConfigService,
  ) {}

  @OnEvent(CHZZK_DONATION_EVENT)
  async onDonation(event: ChzzkDonationEvent): Promise<void> {
    try {
      // 서버에서 치지직을 꺼둔 뒤에도 소켓이 살아 있을 수 있다.
      const enabled = await this.guildServiceConfigService.isEnabled(
        event.guildId,
        'chzzk',
      );
      if (!enabled) return;

      const logChannelId = await this.guildChannelService.findChannelId(
        event.guildId,
        'chzzk',
        'log',
      );
      if (!logChannelId) return;

      const channel = await this.channels.fetch(logChannelId);
      if (!channel?.isSendable()) return;

      await channel.send({ embeds: [this.buildEmbed(event)] });
    } catch (error) {
      this.logger.error('후원 알림 실패', error);
    }
  }

  private buildEmbed(event: ChzzkDonationEvent): EmbedBuilder {
    const kind = DONATION_KINDS[event.donationType] ?? DONATION_KINDS.CHAT;

    const embed = new EmbedBuilder()
      .setTitle(`${kind.emoji} ${kind.label}`)
      .setColor(kind.color)
      // 후원자·금액은 한 줄에 나란히, 채널 정보는 그 아래 전체 폭으로 둔다.
      .addFields(
        { name: '후원자', value: event.donatorNickname, inline: true },
        {
          name: '금액',
          value: this.formatAmount(event.payAmount),
          inline: true,
        },
        { name: '채널', value: this.formatChannel(event), inline: false },
      )
      // 수신 시각이 아니라 치지직이 이벤트를 보낸 시각을 쓴다.
      .setTimestamp(event.sentAt);

    if (event.donationText) {
      embed.setDescription(event.donationText);
    }

    return embed;
  }

  /**
   * 채널명 · 치지직 UID · 연결된 Discord 계정을 한 블록에 묶는다.
   * 임베드 안의 멘션은 링크로만 보이고 알림은 울리지 않는다.
   */
  private formatChannel(event: ChzzkDonationEvent): string {
    const lines = [event.channelName, `\`${event.channelId}\``];

    if (event.streamerDiscordId) {
      lines.push(`<@${event.streamerDiscordId}>`);
    }

    return lines.join('\n');
  }

  private formatAmount(payAmount: number): string {
    return `${payAmount.toLocaleString('ko-KR')}원`;
  }
}
