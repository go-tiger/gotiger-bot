import { Injectable, Logger } from '@nestjs/common';
import { Button, ComponentParam, Context } from 'necord';
import type { ButtonContext } from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { GuildChannelService } from '../../modules/guild/services/guild-channel.service';
import { GuildServiceConfigService } from '../../modules/guild/services/guild-service-config.service';
import { SetupDashboardService } from './setup-dashboard.service';
import { LinkProviderRegistry } from '../../discord/shared/providers/link-provider.registry';
import type { ServiceCategory } from '../../common/constants/services';
import {
  SETUP_DISABLE_CANCEL_BUTTON_ID,
  SETUP_DISABLE_CONFIRM_BUTTON_ID,
  SETUP_TOGGLE_BUTTON_ID,
  buildDisableCancelButtonId,
  buildDisableConfirmButtonId,
} from '../../discord/shared/discord.constants';

@Injectable()
export class ServiceToggleButton {
  private readonly logger = new Logger(ServiceToggleButton.name);

  constructor(
    private readonly guildChannelService: GuildChannelService,
    private readonly guildServiceConfigService: GuildServiceConfigService,
    private readonly dashboard: SetupDashboardService,
    private readonly registry: LinkProviderRegistry,
  ) {}

  @Button(SETUP_TOGGLE_BUTTON_ID)
  async onToggle(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('service') service: string,
  ) {
    const provider = this.registry.find(service);
    if (!provider || !interaction.guildId) {
      return this.replyUnknown(interaction);
    }

    // DB 조회 전에 먼저 응답해야 3초 제한에 걸리지 않는다.
    await interaction.deferUpdate();

    const enabled = await this.guildServiceConfigService.isEnabled(
      interaction.guildId,
      provider.id,
    );

    // 끄면 채널이 삭제되므로 되돌릴 수 없다.
    // 대시보드 메시지 자체를 확인 화면으로 바꿔, 이후 버튼이 같은 메시지를 잇게 한다.
    if (enabled) {
      const confirm = new EmbedBuilder()
        .setTitle(`${provider.label} 사용 해제`)
        .setDescription(
          '사용을 해제하면 이 서비스의 등록/로그 채널이 **삭제**됩니다.\n' +
            '계속할까요?',
        )
        .setColor(0xed4245);

      return interaction.editReply({
        embeds: [confirm],
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(buildDisableConfirmButtonId(provider.id))
              .setLabel('해제하고 채널 삭제')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(buildDisableCancelButtonId(provider.id))
              .setLabel('취소')
              .setStyle(ButtonStyle.Secondary),
          ),
        ],
      });
    }

    await this.guildServiceConfigService.setEnabled(
      interaction.guildId,
      provider.id,
      provider.category,
      true,
    );

    await this.refreshDashboard(interaction, provider.category);

    return interaction.followUp({
      content: `**${provider.label}** 사용을 시작했습니다. 이어서 채널을 설정해주세요.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  @Button(SETUP_DISABLE_CONFIRM_BUTTON_ID)
  async onDisableConfirm(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('service') service: string,
  ) {
    const provider = this.registry.find(service);
    if (!provider || !interaction.guildId) {
      return this.replyUnknown(interaction);
    }

    await interaction.deferUpdate();

    const channelIds = await this.guildChannelService.findChannelIds(
      interaction.guildId,
      provider.id,
    );

    const deleted = await this.deleteChannels(interaction, channelIds);

    await this.guildChannelService.clear(interaction.guildId, provider.id);
    await this.guildServiceConfigService.setEnabled(
      interaction.guildId,
      provider.id,
      provider.category,
      false,
    );

    await this.refreshDashboard(interaction, provider.category);

    return interaction.followUp({
      content:
        `**${provider.label}** 사용을 해제했습니다.` +
        (deleted > 0 ? ` 채널 ${deleted}개를 삭제했습니다.` : ''),
      flags: MessageFlags.Ephemeral,
    });
  }

  /** 확인 화면을 원래 분류 화면으로 되돌린다. */
  @Button(SETUP_DISABLE_CANCEL_BUTTON_ID)
  async onDisableCancel(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('service') service: string,
  ) {
    const provider = this.registry.find(service);
    if (!provider || !interaction.guildId) {
      return this.replyUnknown(interaction);
    }

    await interaction.deferUpdate();

    const { embeds, components } = await this.dashboard.buildCategory(
      interaction.guildId,
      provider.category,
    );

    return interaction.editReply({ embeds, components });
  }

  /** 매핑된 채널을 실제로 삭제하고 삭제된 개수를 돌려준다. */
  private async deleteChannels(
    interaction: ButtonContext[0],
    channelIds: string[],
  ): Promise<number> {
    let deleted = 0;

    for (const channelId of channelIds) {
      try {
        const channel = await interaction.client.channels.fetch(channelId);
        // 카테고리는 다른 서비스와 공유하므로 삭제하지 않는다.
        if (!channel || channel.type === ChannelType.GuildCategory) continue;
        if (!('delete' in channel)) continue;

        await channel.delete();
        deleted += 1;
      } catch (error) {
        this.logger.warn(`채널 삭제 실패: ${channelId}`, error);
      }
    }

    return deleted;
  }

  /** 버튼이 달려 있던 분류 화면을 최신 상태로 다시 그린다. */
  private async refreshDashboard(
    interaction: ButtonContext[0],
    category: ServiceCategory,
  ): Promise<void> {
    if (!interaction.guildId) return;

    try {
      const { embeds, components } = await this.dashboard.buildCategory(
        interaction.guildId,
        category,
      );
      await interaction.editReply({ embeds, components });
    } catch (error) {
      this.logger.warn('대시보드 갱신 실패', error);
    }
  }

  private replyUnknown(interaction: ButtonContext[0]) {
    return interaction.reply({
      content: '알 수 없는 서비스입니다. 다시 `/설정` 을 실행해주세요.',
      flags: MessageFlags.Ephemeral,
    });
  }
}
