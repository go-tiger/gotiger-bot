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
import { REGISTER_BUTTON_ID } from '../discord.constants';

@Injectable()
export class RegisterPanelCommand {
  @SlashCommand({
    name: '등록',
    description: '이 채널에 Minecraft 계정 연결 패널을 설치합니다.',
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
    dmPermission: false,
  })
  async onRegisterPanel(@Context() [interaction]: SlashCommandContext) {
    if (!interaction.channel?.isSendable()) {
      return interaction.reply({
        content: '이 채널에는 메시지를 보낼 수 없습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Minecraft 계정 연결')
      .setDescription(
        '아래 버튼을 눌러 Microsoft 계정으로 로그인하면\n' +
          'Minecraft 계정이 Discord 계정과 연결됩니다.',
      )
      .setColor(0x5865f2)
      .addFields({
        name: '안내',
        value:
          '· Minecraft를 소유한 계정으로 로그인해야 합니다.\n' +
          '· 발급되는 링크는 본인만 사용해주세요.',
      });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(REGISTER_BUTTON_ID)
        .setLabel('계정 연결하기')
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({
      content: '등록 패널을 설치했습니다.',
      flags: MessageFlags.Ephemeral,
    });
  }
}
