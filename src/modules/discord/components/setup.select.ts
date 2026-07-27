import { Injectable } from '@nestjs/common';
import { ChannelSelect, Context, SelectedChannels } from 'necord';
import type { ChannelSelectContext } from 'necord';
import { MessageFlags } from 'discord.js';
import type { Channel, Collection } from 'discord.js';
import { GuildService } from '../../guild/services/guild.service';
import { RegisterPanelService } from '../services/register-panel.service';
import {
  SETUP_LOG_SELECT_ID,
  SETUP_REGISTER_SELECT_ID,
} from '../discord.constants';

@Injectable()
export class SetupSelect {
  constructor(
    private readonly guildService: GuildService,
    private readonly registerPanelService: RegisterPanelService,
  ) {}

  @ChannelSelect(SETUP_REGISTER_SELECT_ID)
  async onRegisterChannel(
    @Context() [interaction]: ChannelSelectContext,
    @SelectedChannels() channels: Collection<string, Channel>,
  ) {
    const channel = channels.first();
    if (!interaction.guildId || !channel?.isSendable()) {
      return interaction.reply({
        content: '이 채널에는 메시지를 보낼 수 없습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await this.registerPanelService.post(channel);
    await this.guildService.setChannels(interaction.guildId, {
      registerChannelId: channel.id,
    });

    return interaction.reply({
      content: `등록 채널을 <#${channel.id}> 로 설정하고 패널을 설치했습니다.`,
    });
  }

  @ChannelSelect(SETUP_LOG_SELECT_ID)
  async onLogChannel(
    @Context() [interaction]: ChannelSelectContext,
    @SelectedChannels() channels: Collection<string, Channel>,
  ) {
    const channel = channels.first();
    if (!interaction.guildId || !channel) {
      return interaction.reply({
        content: '채널을 찾을 수 없습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await this.guildService.setChannels(interaction.guildId, {
      logChannelId: channel.id,
    });

    return interaction.reply({
      content: `로그 채널을 <#${channel.id}> 로 설정했습니다.`,
    });
  }
}
