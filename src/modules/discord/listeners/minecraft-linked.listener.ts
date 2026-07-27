import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChannelManager, EmbedBuilder } from 'discord.js';
import { GuildService } from '../../guild/services/guild.service';
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
  ) {}

  @OnEvent(MINECRAFT_LINKED_EVENT)
  async onLinked(event: MinecraftLinkedEvent): Promise<void> {
    try {
      const guild = await this.guildService.findOne(event.guildId);
      if (!guild?.logChannelId) return;

      const channel = await this.channels.fetch(guild.logChannelId);
      if (!channel?.isSendable()) return;

      const embed = new EmbedBuilder()
        .setTitle('마인크래프트')
        .setColor(0x57f287)
        .setThumbnail(`https://mc-heads.net/avatar/${event.uuid}`)
        .setDescription(
          `<@${event.discordId}>\n\n` +
            `닉네임 : ${event.username}\n` +
            `UUID : \`${event.uuid}\``,
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    } catch (error) {
      this.logger.error('로그 채널 알림 실패', error);
    }
  }
}
