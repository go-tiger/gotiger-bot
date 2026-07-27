import { Injectable } from '@nestjs/common';
import { Context, SlashCommand } from 'necord';
import type { SlashCommandContext } from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { GuildService } from '../../guild/services/guild.service';
import {
  SETUP_AUTO_BUTTON_ID,
  SETUP_MANUAL_BUTTON_ID,
} from '../discord.constants';

@Injectable()
export class SetupCommand {
  constructor(private readonly guildService: GuildService) {}

  @SlashCommand({
    name: '설정',
    description: 'Minecraft 계정 연결 채널을 설정합니다.',
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
    dmPermission: false,
  })
  async onSetup(@Context() [interaction]: SlashCommandContext) {
    if (!interaction.guildId) {
      return interaction.reply({
        content: '서버 안에서만 사용할 수 있습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const guild = await this.guildService.findOne(interaction.guildId);

    const embed = new EmbedBuilder()
      .setTitle('채널 설정')
      .setDescription(
        '계정 등록 채널과 로그 채널을 설정합니다.\n' +
          '자동으로 만들거나, 기존 채널을 지정할 수 있습니다.',
      )
      .setColor(0x5865f2)
      .addFields({
        name: '현재 설정',
        value:
          `· 등록 채널: ${this.format(guild?.registerChannelId)}\n` +
          `· 로그 채널: ${this.format(guild?.logChannelId)}`,
      });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(SETUP_AUTO_BUTTON_ID)
        .setLabel('자동으로 채널 생성')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(SETUP_MANUAL_BUTTON_ID)
        .setLabel('기존 채널 선택')
        .setStyle(ButtonStyle.Secondary),
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
    });
  }

  private format(channelId?: string | null): string {
    return channelId ? `<#${channelId}>` : '설정되지 않음';
  }
}
