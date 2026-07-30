import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChannelManager, EmbedBuilder, MessageFlags } from 'discord.js';
import { GuildChannelService } from '../../modules/guild/services/guild-channel.service';
import { PendingRegisterService } from './pending-register.service';
import {
  CHZZK_LINKED_EVENT,
  ChzzkLinkedEvent,
} from '../../common/events/chzzk-linked.event';
import {
  STEAM_LINKED_EVENT,
  SteamLinkedEvent,
} from '../../common/events/steam-linked.event';
import type { ServiceId } from '../../common/constants/services';

/** 연동 완료를 버튼을 누른 본인과 로그 채널에 알린다. */
@Injectable()
export class LinkedListener {
  private readonly logger = new Logger(LinkedListener.name);

  constructor(
    private readonly channels: ChannelManager,
    private readonly guildChannelService: GuildChannelService,
    private readonly pendingRegisterService: PendingRegisterService,
  ) {}

  @OnEvent(CHZZK_LINKED_EVENT)
  async onChzzkLinked(event: ChzzkLinkedEvent): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('치지직 채널 연결 완료')
      .setColor(0x00ffa3)
      .setDescription(
        `<@${event.discordId}>\n\n` +
          `채널명 : ${event.channelName}\n` +
          `채널 ID : \`${event.channelId}\``,
      )
      .setTimestamp();

    await this.notify(event.discordId, event.guildId, 'chzzk', embed);
  }

  @OnEvent(STEAM_LINKED_EVENT)
  async onSteamLinked(event: SteamLinkedEvent): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('Steam 계정 연결 완료')
      .setColor(0x1b2838)
      .setDescription(
        `<@${event.discordId}>\n\n` +
          `계정명 : ${event.personaName}\n` +
          `SteamID : \`${event.steamId}\`\n` +
          `팰월드 소유 : ${event.ownsPalworld ? '확인됨' : '확인 불가'}`,
      )
      .setTimestamp();

    // Steam 은 팰월드 연동 수단이므로 팰월드 로그 채널에 남긴다.
    await this.notify(event.discordId, event.guildId, 'palworld', embed);
  }

  private async notify(
    discordId: string,
    guildId: string,
    service: ServiceId,
    embed: EmbedBuilder,
  ): Promise<void> {
    await Promise.all([
      this.notifyUser(discordId, embed),
      this.notifyLogChannel(guildId, service, embed),
    ]);
  }

  /** 버튼을 눌렀던 유저에게만 보이는 메시지를 결과로 교체한다. */
  private async notifyUser(
    discordId: string,
    embed: EmbedBuilder,
  ): Promise<void> {
    const interaction = this.pendingRegisterService.take(discordId);
    if (!interaction) return;

    try {
      await interaction.deleteReply();
      await interaction.followUp({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      this.logger.error('유저 알림 실패', error);
    }
  }

  private async notifyLogChannel(
    guildId: string,
    service: ServiceId,
    embed: EmbedBuilder,
  ): Promise<void> {
    try {
      const logChannelId = await this.guildChannelService.findChannelId(
        guildId,
        service,
        'log',
      );
      if (!logChannelId) return;

      const channel = await this.channels.fetch(logChannelId);
      if (!channel?.isSendable()) return;

      await channel.send({ embeds: [embed] });
    } catch (error) {
      this.logger.error('로그 채널 알림 실패', error);
    }
  }
}
