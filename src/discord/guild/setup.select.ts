import { Injectable } from '@nestjs/common';
import {
  ChannelSelect,
  ComponentParam,
  Context,
  SelectedChannels,
} from 'necord';
import type { ChannelSelectContext } from 'necord';
import { MessageFlags } from 'discord.js';
import type { Channel, Collection } from 'discord.js';
import { GuildChannelService } from '../../modules/guild/services/guild-channel.service';
import { GuildServiceConfigService } from '../../modules/guild/services/guild-service-config.service';
import { RegisterPanelService } from '../streamer/register-panel.service';
import { LinkProviderRegistry } from '../shared/providers/link-provider.registry';
import { SETUP_SELECT_ID } from '../shared/discord.constants';
import type { ChannelKind } from '../../common/constants/services';

@Injectable()
export class SetupSelect {
  constructor(
    private readonly guildChannelService: GuildChannelService,
    private readonly guildServiceConfigService: GuildServiceConfigService,
    private readonly registerPanelService: RegisterPanelService,
    private readonly registry: LinkProviderRegistry,
  ) {}

  @ChannelSelect(SETUP_SELECT_ID)
  async onChannel(
    @Context() [interaction]: ChannelSelectContext,
    @SelectedChannels() channels: Collection<string, Channel>,
    @ComponentParam('service') service: string,
    @ComponentParam('kind') kind: string,
  ) {
    const provider = this.registry.find(service);
    if (!provider || !interaction.guildId) {
      return interaction.reply({
        content: '알 수 없는 서비스입니다. 다시 `/설정` 을 실행해주세요.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const channel = channels.first();
    const isRegister = kind === 'register';

    // 결과는 공개 메시지로 남기므로 공개로 defer 한다.
    await interaction.deferReply();

    const enabled = await this.guildServiceConfigService.isEnabled(
      interaction.guildId,
      provider.id,
    );
    if (!enabled) {
      return interaction.editReply({
        content: `**${provider.label}** 은 사용 중이 아닙니다. \`/설정\` 에서 먼저 켜주세요.`,
      });
    }

    // 등록 채널에는 패널을 게시해야 하므로 전송 가능 여부까지 확인한다.
    if (!channel || (isRegister && !channel.isSendable())) {
      return interaction.editReply({
        content: isRegister
          ? '이 채널에는 메시지를 보낼 수 없습니다.'
          : '채널을 찾을 수 없습니다.',
      });
    }

    if (isRegister && channel.isSendable()) {
      await this.registerPanelService.post(channel, provider);
    }

    await this.guildChannelService.set({
      guildId: interaction.guildId,
      service: provider.id,
      category: provider.category,
      kind: kind as ChannelKind,
      channelId: channel.id,
    });

    return interaction.editReply({
      content: isRegister
        ? `${provider.label} 등록 채널을 <#${channel.id}> 로 설정하고 패널을 설치했습니다.`
        : `${provider.label} 로그 채널을 <#${channel.id}> 로 설정했습니다.`,
    });
  }
}
