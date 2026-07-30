import { Injectable, Logger } from '@nestjs/common';
import { Button, ComponentParam, Context } from 'necord';
import type { ButtonContext } from 'necord';
import { MessageFlags } from 'discord.js';
import { GuildServiceConfigService } from '../../modules/guild/services/guild-service-config.service';
import { SetupDashboardService } from './setup-dashboard.service';
import { LinkProviderRegistry } from '../shared/providers/link-provider.registry';
import type { ServiceCategory } from '../../common/constants/services';
import { SETUP_TOGGLE_BUTTON_ID } from '../shared/discord.constants';

/**
 * 서비스 사용을 켜고 끈다.
 * 껐을 때 채널은 삭제하지 않는다 — 다시 켤 때 재생성할 필요가 없고,
 * 실수로 눌러 채널이 사라지는 사고를 막는다.
 */
@Injectable()
export class ServiceToggleButton {
  private readonly logger = new Logger(ServiceToggleButton.name);

  constructor(
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
      return interaction.reply({
        content: '알 수 없는 서비스입니다. 다시 `/설정` 을 실행해주세요.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // DB 조회 전에 먼저 응답해야 3초 제한에 걸리지 않는다.
    await interaction.deferUpdate();

    const enabled = await this.guildServiceConfigService.isEnabled(
      interaction.guildId,
      provider.id,
    );

    await this.guildServiceConfigService.setEnabled(
      interaction.guildId,
      provider.id,
      provider.category,
      !enabled,
    );

    await this.refreshDashboard(interaction, provider.category);

    return interaction.followUp({
      content: enabled
        ? `**${provider.label}** 사용을 해제했습니다. 채널은 그대로 남아 있습니다.`
        : `**${provider.label}** 사용을 시작했습니다. 이어서 채널을 설정해주세요.`,
      flags: MessageFlags.Ephemeral,
    });
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
}
