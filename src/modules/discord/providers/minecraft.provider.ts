import { Injectable } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { buildRegisterButtonId } from '../discord.constants';
import type { LinkProvider, ServicePanel } from './link-provider.interface';

@Injectable()
export class MinecraftProvider implements LinkProvider {
  readonly id = 'minecraft' as const;
  readonly category = 'game' as const;
  readonly label = '마인크래프트';
  readonly channelNames = {
    register: '마인크래프트-등록',
    log: '마인크래프트-로그',
  };

  buildPanel(): ServicePanel {
    const embed = new EmbedBuilder()
      .setTitle('Minecraft 계정 연결')
      .setDescription(
        '아래 버튼을 눌러 Microsoft 계정으로 로그인하면\n' +
          'Minecraft 계정이 Discord 계정과 연결됩니다.',
      )
      .setColor(0x5865f2)
      .addFields({
        name: '안내',
        value:
          '· Minecraft를 소유한 계정으로 로그인해야 합니다.\n' +
          '· 발급되는 링크는 본인만 사용해주세요.',
      });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildRegisterButtonId(this.id))
        .setLabel('계정 연결하기')
        .setStyle(ButtonStyle.Primary),
    );

    return { embeds: [embed], components: [row] };
  }
}
