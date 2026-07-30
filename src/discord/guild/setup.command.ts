import { Injectable } from '@nestjs/common';
import { Context, SlashCommand } from 'necord';
import type { SlashCommandContext } from 'necord';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { GuildService } from '../../modules/guild/guild.service';
import { SetupDashboardService } from './setup-dashboard.service';

@Injectable()
export class SetupCommand {
  constructor(
    private readonly dashboard: SetupDashboardService,
    private readonly guildService: GuildService,
  ) {}

  @SlashCommand({
    name: '설정',
    description: '이 서버에서 사용할 서비스와 채널을 설정합니다.',
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

    // DB 조회 전에 먼저 응답해야 3초 제한에 걸리지 않는다.
    await interaction.deferReply();

    // 게임서버 등록이 FK 를 걸 수 있도록 길드 행을 만들어 둔다.
    await this.guildService.ensure(interaction.guildId);

    const { embeds, components } = await this.dashboard.buildHome(
      interaction.guildId,
    );

    return interaction.editReply({ embeds, components });
  }
}
