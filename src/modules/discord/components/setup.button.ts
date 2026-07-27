import { Injectable, Logger } from '@nestjs/common';
import { Button, Context } from 'necord';
import type { ButtonContext } from 'necord';
import {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
} from 'discord.js';
import { GuildService } from '../../guild/services/guild.service';
import { ChannelSetupService } from '../services/channel-setup.service';
import { RegisterPanelService } from '../services/register-panel.service';
import {
  SETUP_AUTO_BUTTON_ID,
  SETUP_LOG_SELECT_ID,
  SETUP_MANUAL_BUTTON_ID,
  SETUP_REGISTER_SELECT_ID,
} from '../discord.constants';

@Injectable()
export class SetupButton {
  private readonly logger = new Logger(SetupButton.name);

  constructor(
    private readonly guildService: GuildService,
    private readonly channelSetupService: ChannelSetupService,
    private readonly registerPanelService: RegisterPanelService,
  ) {}

  @Button(SETUP_AUTO_BUTTON_ID)
  async onAuto(@Context() [interaction]: ButtonContext) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '서버 안에서만 사용할 수 있습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    try {
      const { registerChannel, logChannel } =
        await this.channelSetupService.createChannels(interaction.guild);

      await this.registerPanelService.post(registerChannel);

      await this.guildService.setChannels(interaction.guild.id, {
        registerChannelId: registerChannel.id,
        logChannelId: logChannel.id,
      });

      return interaction.editReply({
        content:
          `채널을 생성했습니다.\n` +
          `· 등록 채널: <#${registerChannel.id}>\n` +
          `· 로그 채널: <#${logChannel.id}>`,
      });
    } catch (error) {
      this.logger.error(error);

      return interaction.editReply({
        content:
          '채널을 생성하지 못했습니다. 봇에게 채널 관리 권한이 있는지 확인해주세요.',
      });
    }
  }

  @Button(SETUP_MANUAL_BUTTON_ID)
  onManual(@Context() [interaction]: ButtonContext) {
    const rows = [
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(SETUP_REGISTER_SELECT_ID)
          .setPlaceholder('등록 채널 선택')
          .setChannelTypes(ChannelType.GuildText),
      ),
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(SETUP_LOG_SELECT_ID)
          .setPlaceholder('로그 채널 선택')
          .setChannelTypes(ChannelType.GuildText),
      ),
    ];

    return interaction.reply({
      content: '사용할 채널을 선택해주세요.',
      components: rows,
      flags: MessageFlags.Ephemeral,
    });
  }
}
