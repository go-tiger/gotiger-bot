import { Injectable } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { buildRegisterButtonId } from '../../../discord/shared/discord.constants';
import type { LinkProvider, ServicePanel } from './link-provider.interface';

@Injectable()
export class PalworldProvider implements LinkProvider {
  readonly id = 'palworld' as const;
  readonly category = 'game' as const;
  readonly label = '팰월드';
  readonly channelNames = {
    register: '팰월드-등록',
    log: '팰월드-로그',
  };
  readonly linkable = false;

  buildPanel(): ServicePanel {
    const embed = new EmbedBuilder()
      .setTitle('팰월드 계정 연결')
      .setDescription(
        '아래 버튼을 눌러 Steam 계정으로 로그인하면\n' +
          'Steam 계정이 Discord 계정과 연결됩니다.',
      )
      .setColor(0x1b2838)
      .addFields({
        name: '안내',
        value:
          '· 팰월드를 소유한 Steam 계정으로 로그인해야 합니다.\n' +
          '· 프로필의 "게임 상세 정보"가 공개여야 소유 여부를 확인할 수 있습니다.',
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
