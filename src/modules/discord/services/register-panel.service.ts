import { Injectable } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import type { SendableChannels } from 'discord.js';
import { REGISTER_BUTTON_ID } from '../discord.constants';

@Injectable()
export class RegisterPanelService {
  /** 지정한 채널에 계정 연결 패널을 게시한다. */
  async post(channel: SendableChannels): Promise<void> {
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
        .setCustomId(REGISTER_BUTTON_ID)
        .setLabel('계정 연결하기')
        .setStyle(ButtonStyle.Primary),
    );

    await channel.send({ embeds: [embed], components: [row] });
  }
}
