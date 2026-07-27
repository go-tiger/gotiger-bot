import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChannelManager, EmbedBuilder, MessageFlags } from 'discord.js';
import { GuildService } from '../../guild/services/guild.service';
import { PendingRegisterService } from '../services/pending-register.service';
import {
  MINECRAFT_LINKED_EVENT,
  MinecraftLinkedEvent,
} from '../../../common/events/minecraft-linked.event';

@Injectable()
export class MinecraftLinkedListener {
  private readonly logger = new Logger(MinecraftLinkedListener.name);

  constructor(
    private readonly channels: ChannelManager,
    private readonly guildService: GuildService,
    private readonly pendingRegisterService: PendingRegisterService,
  ) {}

  @OnEvent(MINECRAFT_LINKED_EVENT)
  async onLinked(event: MinecraftLinkedEvent): Promise<void> {
    await Promise.all([this.notifyUser(event), this.notifyLogChannel(event)]);
  }

  /** 버튼을 눌렀던 유저에게만 보이는 메시지를 결과로 교체한다. */
  private async notifyUser(event: MinecraftLinkedEvent): Promise<void> {
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

  private async notifyLogChannel(event: MinecraftLinkedEvent): Promise<void> {
    try {
      const guild = await this.guildService.findOne(event.guildId);
      if (!guild?.logChannelId) return;

      const channel = await this.channels.fetch(guild.logChannelId);
      if (!channel?.isSendable()) return;

      await channel.send({
        embeds: [this.buildEmbed(event)],
      });
    } catch (error) {
      this.logger.error('로그 채널 알림 실패', error);
    }
  }

  private buildEmbed(event: MinecraftLinkedEvent): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle('마인크래프트')
      .setColor(0x57f287)
      .setThumbnail(`https://mc-heads.net/avatar/${event.uuid}`)
      .setDescription(
        `<@${event.discordId}>\n\n` +
          `닉네임 : ${event.username}\n` +
          `UUID : \`${event.uuid}\``,
      )
      .setTimestamp();
  }
}
