import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChannelManager, EmbedBuilder, MessageFlags } from 'discord.js';
import { GuildChannelService } from '../../guild/services/guild-channel.service';
import { PendingRegisterService } from '../services/pending-register.service';
import {
  CHZZK_LINKED_EVENT,
  ChzzkLinkedEvent,
} from '../../../common/events/chzzk-linked.event';

@Injectable()
export class ChzzkLinkedListener {
  private readonly logger = new Logger(ChzzkLinkedListener.name);

  constructor(
    private readonly channels: ChannelManager,
    private readonly guildChannelService: GuildChannelService,
    private readonly pendingRegisterService: PendingRegisterService,
  ) {}

  @OnEvent(CHZZK_LINKED_EVENT)
  async onLinked(event: ChzzkLinkedEvent): Promise<void> {
    await Promise.all([this.notifyUser(event), this.notifyLogChannel(event)]);
  }

  /** 버튼을 눌렀던 유저에게만 보이는 메시지를 결과로 교체한다. */
  private async notifyUser(event: ChzzkLinkedEvent): Promise<void> {
    const interaction = this.pendingRegisterService.take(event.discordId);
    if (!interaction) return;

    try {
      await interaction.deleteReply();
      await interaction.followUp({
        embeds: [this.buildEmbed(event)],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      this.logger.error('유저 알림 실패', error);
    }
  }

  private async notifyLogChannel(event: ChzzkLinkedEvent): Promise<void> {
    try {
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
      this.logger.error('로그 채널 알림 실패', error);
    }
  }

  private buildEmbed(event: ChzzkLinkedEvent): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle('치지직')
      .setColor(0x00ffa3)
      .setDescription(
        `<@${event.discordId}>\n\n` +
          `채널명 : ${event.channelName}\n` +
          `채널 ID : \`${event.channelId}\``,
      )
      .setTimestamp();
  }
}
