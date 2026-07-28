import { Injectable, Logger } from '@nestjs/common';
import { Button, ComponentParam, Context } from 'necord';
import type { ButtonContext } from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { GuildChannelService } from '../../modules/guild/services/guild-channel.service';
import { GuildServiceConfigService } from '../../modules/guild/services/guild-service-config.service';
import { ChannelSetupService } from './channel-setup.service';
import { RegisterPanelService } from '../auth/register-panel.service';
import { LinkProviderRegistry } from '../../discord/shared/providers/link-provider.registry';
import type { LinkProvider } from '../../discord/shared/providers/link-provider.interface';
import {
  SETUP_AUTO_BUTTON_ID,
  SETUP_MANUAL_BUTTON_ID,
  SETUP_SERVICE_BUTTON_ID,
  buildAutoButtonId,
  buildManualButtonId,
  buildSelectId,
} from '../../discord/shared/discord.constants';

@Injectable()
export class SetupButton {
  private readonly logger = new Logger(SetupButton.name);

  constructor(
    private readonly guildChannelService: GuildChannelService,
    private readonly guildServiceConfigService: GuildServiceConfigService,
    private readonly channelSetupService: ChannelSetupService,
    private readonly registerPanelService: RegisterPanelService,
    private readonly registry: LinkProviderRegistry,
  ) {}

  /** 대시보드에서 서비스를 고르면 자동/수동 선택지를 보여준다. */
  @Button(SETUP_SERVICE_BUTTON_ID)
  async onService(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('service') service: string,
  ) {
    const provider = this.registry.find(service);
    if (!provider || !interaction.guildId) {
      return this.replyUnknown(interaction);
    }
    // DB 조회 전에 먼저 응답해야 3초 제한에 걸리지 않는다.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await this.ensureEnabled(interaction, provider))) return;

    const channels = await this.guildChannelService.findAllForGuild(
      interaction.guildId,
    );

    const embed = new EmbedBuilder()
      .setTitle(`${provider.label} 채널 설정`)
      .setDescription(
        '등록 채널과 로그 채널을 설정합니다.\n' +
          '자동으로 만들거나, 기존 채널을 지정할 수 있습니다.',
      )
      .setColor(0x5865f2)
      .addFields({
        name: '현재 설정',
        value:
          `· 등록 채널: ${this.format(channels.get(`${provider.id}:register`))}\n` +
          `· 로그 채널: ${this.format(channels.get(`${provider.id}:log`))}`,
      });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildAutoButtonId(provider.id))
        .setLabel('자동으로 채널 생성')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(buildManualButtonId(provider.id))
        .setLabel('기존 채널 선택')
        .setStyle(ButtonStyle.Secondary),
    );

    return interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  }

  @Button(SETUP_AUTO_BUTTON_ID)
  async onAuto(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('service') service: string,
  ) {
    const provider = this.registry.find(service);
    if (!provider || !interaction.guild) {
      return this.replyUnknown(interaction);
    }
    // 채널 생성은 오래 걸리므로 어떤 조회보다 먼저 응답한다.
    await interaction.deferReply();

    if (!(await this.ensureEnabled(interaction, provider))) return;

    try {
      const { registerChannel, logChannel } =
        await this.channelSetupService.createChannels(
          interaction.guild,
          provider,
        );

      await this.registerPanelService.post(registerChannel, provider);

      await this.saveChannels(interaction.guild.id, provider, {
        register: registerChannel.id,
        log: logChannel.id,
      });

      return interaction.editReply({
        content:
          `${provider.label} 채널을 생성했습니다.\n` +
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
  async onManual(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('service') service: string,
  ) {
    const provider = this.registry.find(service);
    if (!provider) {
      return this.replyUnknown(interaction);
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await this.ensureEnabled(interaction, provider))) return;

    const rows = [
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(buildSelectId(provider.id, 'register'))
          .setPlaceholder(`${provider.label} 등록 채널 선택`)
          .setChannelTypes(ChannelType.GuildText),
      ),
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(buildSelectId(provider.id, 'log'))
          .setPlaceholder(`${provider.label} 로그 채널 선택`)
          .setChannelTypes(ChannelType.GuildText),
      ),
    ];

    return interaction.editReply({
      content: `${provider.label}에 사용할 채널을 선택해주세요.`,
      components: rows,
    });
  }

  private saveChannels(
    guildId: string,
    provider: LinkProvider,
    channelIds: { register: string; log: string },
  ): Promise<void> {
    return this.guildChannelService.setMany([
      {
        guildId,
        service: provider.id,
        category: provider.category,
        kind: 'register',
        channelId: channelIds.register,
      },
      {
        guildId,
        service: provider.id,
        category: provider.category,
        kind: 'log',
        channelId: channelIds.log,
      },
    ]);
  }

  /** 사용 중이 아닌 서비스는 채널 설정을 막는다. */
  private async ensureEnabled(
    interaction: ButtonContext[0],
    provider: LinkProvider,
  ): Promise<boolean> {
    const enabled = await this.guildServiceConfigService.isEnabled(
      interaction.guildId ?? '',
      provider.id,
    );
    if (enabled) return true;

    const content = `**${provider.label}** 은 사용 중이 아닙니다. \`/설정\` 에서 먼저 켜주세요.`;

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content });
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }

    return false;
  }

  private replyUnknown(interaction: ButtonContext[0]) {
    return interaction.reply({
      content: '알 수 없는 서비스입니다. 다시 `/설정` 을 실행해주세요.',
      flags: MessageFlags.Ephemeral,
    });
  }

  private format(channelId?: string): string {
    return channelId ? `<#${channelId}>` : '설정되지 않음';
  }
}
