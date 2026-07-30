import { Injectable } from '@nestjs/common';
import { Button, ComponentParam, Context } from 'necord';
import type { ButtonContext } from 'necord';
import { MessageFlags } from 'discord.js';
import { SetupDashboardService } from './setup-dashboard.service';
import {
  SERVICE_CATEGORIES,
  type ServiceCategory,
} from '../../common/constants/services';
import {
  SETUP_CATEGORY_BUTTON_ID,
  SETUP_HOME_BUTTON_ID,
} from '../shared/discord.constants';

/** /설정 의 분류 선택 ↔ 서비스 목록 사이 이동을 담당한다. */
@Injectable()
export class SetupNavButton {
  constructor(private readonly dashboard: SetupDashboardService) {}

  @Button(SETUP_CATEGORY_BUTTON_ID)
  async onCategory(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('category') category: string,
  ) {
    if (!interaction.guildId || !this.isCategory(category)) {
      return interaction.reply({
        content: '알 수 없는 분류입니다. 다시 `/설정` 을 실행해주세요.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferUpdate();

    const { embeds, components } = await this.dashboard.buildCategory(
      interaction.guildId,
      category,
    );

    return interaction.editReply({ embeds, components });
  }

  @Button(SETUP_HOME_BUTTON_ID)
  async onHome(@Context() [interaction]: ButtonContext) {
    if (!interaction.guildId) {
      return interaction.reply({
        content: '서버 안에서만 사용할 수 있습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferUpdate();

    const { embeds, components } = await this.dashboard.buildHome(
      interaction.guildId,
    );

    return interaction.editReply({ embeds, components });
  }

  private isCategory(value: string): value is ServiceCategory {
    return (SERVICE_CATEGORIES as string[]).includes(value);
  }
}
