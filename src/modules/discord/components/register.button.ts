import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Button, Context } from 'necord';
import type { ButtonContext } from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { REGISTER_BUTTON_ID } from '../discord.constants';

@Injectable()
export class RegisterButton {
  constructor(private readonly configService: ConfigService) {}

  @Button(REGISTER_BUTTON_ID)
  onRegister(@Context() [interaction]: ButtonContext) {
    if (!interaction.guildId) {
      return interaction.reply({
        content: '서버 안에서만 사용할 수 있습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const baseUrl = this.configService.get<string>('BASE_URL') ?? '';
    const url = `${baseUrl}/auth/login?d=${interaction.user.id}&g=${interaction.guildId}`;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Microsoft 로그인')
        .setStyle(ButtonStyle.Link)
        .setURL(url),
    );

    return interaction.reply({
      content: '아래 버튼을 눌러 Microsoft 계정으로 로그인해주세요.',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  }
}
