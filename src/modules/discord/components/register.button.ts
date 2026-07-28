import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Button, ComponentParam, Context } from 'necord';
import type { ButtonContext } from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { REGISTER_BUTTON_ID } from '../discord.constants';
import { PendingRegisterService } from '../services/pending-register.service';
import { GuildServiceConfigService } from '../../guild/services/guild-service-config.service';
import { LinkProviderRegistry } from '../providers/link-provider.registry';

@Injectable()
export class RegisterButton {
  constructor(
    private readonly configService: ConfigService,
    private readonly pendingRegisterService: PendingRegisterService,
    private readonly guildServiceConfigService: GuildServiceConfigService,
    private readonly registry: LinkProviderRegistry,
  ) {}

  @Button(REGISTER_BUTTON_ID)
  async onRegister(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('service') service: string,
  ) {
    if (!interaction.guildId) {
      return interaction.reply({
        content: '서버 안에서만 사용할 수 있습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const provider = this.registry.find(service);
    if (!provider) {
      return interaction.reply({
        content: '알 수 없는 서비스입니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // DB 조회 전에 먼저 응답해야 3초 제한에 걸리지 않는다.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // 사용 해제 후에도 남아 있는 패널로 연결을 시도할 수 있으므로 막는다.
    const enabled = await this.guildServiceConfigService.isEnabled(
      interaction.guildId,
      provider.id,
    );
    if (!enabled) {
      return interaction.editReply({
        content: `이 서버에서는 ${provider.label} 계정 연결을 사용하지 않습니다.`,
      });
    }

    // 로그인 경로가 없으면 아직 연동이 준비되지 않은 서비스다.
    if (!provider.loginPath) {
      return interaction.editReply({
        content: `${provider.label} 계정 연결은 준비 중입니다.`,
      });
    }

    const baseUrl = this.configService.get<string>('BASE_URL') ?? '';
    const url = `${baseUrl}${provider.loginPath}?d=${interaction.user.id}&g=${interaction.guildId}`;
    const loginLabel = provider.loginLabel ?? '로그인';

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel(loginLabel)
        .setStyle(ButtonStyle.Link)
        .setURL(url),
    );

    await interaction.editReply({
      content: `아래 버튼을 눌러 ${provider.label} 계정으로 로그인해주세요.`,
      components: [row],
    });

    // 연결이 완료되면 이 메시지를 결과로 교체하기 위해 보관한다.
    this.pendingRegisterService.set(interaction.user.id, interaction);
  }
}
