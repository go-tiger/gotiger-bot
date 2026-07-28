import { Injectable } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { GuildChannelService } from '../../guild/services/guild-channel.service';
import { GuildServiceConfigService } from '../../guild/services/guild-service-config.service';
import { LinkProviderRegistry } from '../providers/link-provider.registry';
import {
  CATEGORY_EMOJIS,
  CATEGORY_LABELS,
  SERVICE_CATEGORIES,
  type LinkProvider,
  type ServiceCategory,
} from '../providers/link-provider.interface';
import {
  buildCategoryButtonId,
  buildServiceButtonId,
  buildToggleButtonId,
  SETUP_HOME_BUTTON_ID,
} from '../discord.constants';

/** 한 행에 버튼 5개까지 담을 수 있다. */
const BUTTONS_PER_ROW = 5;
/** 메시지당 액션 행은 5개까지다. */
const MAX_ROWS = 5;

export interface DashboardView {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
}

@Injectable()
export class SetupDashboardService {
  constructor(
    private readonly guildChannelService: GuildChannelService,
    private readonly guildServiceConfigService: GuildServiceConfigService,
    private readonly registry: LinkProviderRegistry,
  ) {}

  /** 1단계: 설정할 분류(게임/플랫폼)를 고르는 화면. */
  async buildHome(guildId: string): Promise<DashboardView> {
    const enabled = await this.loadEnabled(guildId);

    const embed = new EmbedBuilder()
      .setTitle('서버 설정')
      .setDescription('설정할 분류를 선택해주세요.')
      .setColor(0x5865f2);

    for (const category of SERVICE_CATEGORIES) {
      embed.addFields({
        name: `${CATEGORY_EMOJIS[category]} ${CATEGORY_LABELS[category]}`,
        value: this.summarize(category, enabled),
        inline: true,
      });
    }

    const buttons = SERVICE_CATEGORIES.map((category) => {
      const supported = this.registry.byCategory(category).length > 0;

      return (
        new ButtonBuilder()
          .setCustomId(buildCategoryButtonId(category))
          .setLabel(`${CATEGORY_EMOJIS[category]} ${CATEGORY_LABELS[category]}`)
          .setStyle(ButtonStyle.Primary)
          // 아직 지원 서비스가 없는 분류는 눌러도 할 일이 없다.
          .setDisabled(!supported)
      );
    });

    return {
      embeds: [embed],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(buttons),
      ],
    };
  }

  /** 2단계: 분류 안의 서비스를 켜고 끄는 화면. */
  async buildCategory(
    guildId: string,
    category: ServiceCategory,
  ): Promise<DashboardView> {
    const providers = this.registry.byCategory(category);
    const label = `${CATEGORY_EMOJIS[category]} ${CATEGORY_LABELS[category]}`;

    const embed = new EmbedBuilder()
      .setTitle(`${label} 설정`)
      .setColor(0x5865f2);

    const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(SETUP_HOME_BUTTON_ID)
        .setLabel('← 뒤로')
        .setStyle(ButtonStyle.Secondary),
    );

    if (providers.length === 0) {
      embed.setDescription(
        '아직 지원하는 서비스가 없습니다.\n곧 추가될 예정입니다.',
      );

      return { embeds: [embed], components: [backRow] };
    }

    const channels = await this.guildChannelService.findAllForGuild(guildId);
    const enabled = await this.guildServiceConfigService.findEnabled(
      guildId,
      channels,
    );

    embed
      .setDescription(
        '사용할 서비스를 켠 뒤, 아래쪽 버튼으로 채널을 설정해주세요.',
      )
      .addFields({
        name: '현재 상태',
        value: providers
          .map((provider) => this.formatStatus(provider, channels, enabled))
          .join('\n'),
      });

    return {
      embeds: [embed],
      components: this.buildRows(providers, enabled, backRow),
    };
  }

  private async loadEnabled(guildId: string): Promise<Set<string>> {
    const channels = await this.guildChannelService.findAllForGuild(guildId);

    return this.guildServiceConfigService.findEnabled(guildId, channels);
  }

  /** 분류 카드에 보여줄 한 줄 요약. */
  private summarize(category: ServiceCategory, enabled: Set<string>): string {
    const providers = this.registry.byCategory(category);
    if (providers.length === 0) return '준비 중';

    const count = providers.filter((p) => enabled.has(p.id)).length;

    return count > 0
      ? `${count}/${providers.length}개 사용 중`
      : `미설정 (${providers.length}개 가능)`;
  }

  private formatStatus(
    provider: LinkProvider,
    channels: Map<string, string>,
    enabled: Set<string>,
  ): string {
    if (!enabled.has(provider.id)) {
      return `· ${provider.label} — 미사용`;
    }

    const registerChannelId = channels.get(`${provider.id}:register`);

    return registerChannelId
      ? `· ${provider.label} ✅ <#${registerChannelId}>`
      : `· ${provider.label} ⚠️ 채널 미설정`;
  }

  /**
   * 1행: 서비스 사용 토글, 다음 행: 켜져 있는 서비스의 채널 설정 진입,
   * 마지막 행: 분류 선택으로 돌아가기.
   */
  private buildRows(
    providers: LinkProvider[],
    enabled: Set<string>,
    backRow: ActionRowBuilder<ButtonBuilder>,
  ): ActionRowBuilder<ButtonBuilder>[] {
    const toggleButtons = providers.map((provider) =>
      new ButtonBuilder()
        .setCustomId(buildToggleButtonId(provider.id))
        .setLabel(
          enabled.has(provider.id)
            ? `🟢 ${provider.label}`
            : `⚪ ${provider.label}`,
        )
        .setStyle(
          enabled.has(provider.id)
            ? ButtonStyle.Success
            : ButtonStyle.Secondary,
        ),
    );

    const configButtons = providers
      .filter((provider) => enabled.has(provider.id))
      .map((provider) =>
        new ButtonBuilder()
          .setCustomId(buildServiceButtonId(provider.id))
          .setLabel(`${provider.label} 채널 설정`)
          .setStyle(ButtonStyle.Primary),
      );

    const toggleRows = this.chunk(toggleButtons);
    // 뒤로 버튼 자리를 반드시 남긴다.
    const configRows = this.chunk(configButtons).slice(
      0,
      Math.max(0, MAX_ROWS - toggleRows.length - 1),
    );

    return [...toggleRows, ...configRows, backRow];
  }

  private chunk(buttons: ButtonBuilder[]): ActionRowBuilder<ButtonBuilder>[] {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    for (let i = 0; i < buttons.length; i += BUTTONS_PER_ROW) {
      rows.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          buttons.slice(i, i + BUTTONS_PER_ROW),
        ),
      );
    }

    return rows;
  }
}
