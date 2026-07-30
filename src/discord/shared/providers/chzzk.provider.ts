import { Injectable } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import {
  buildRegisterButtonId,
  LINK_STATUS_BUTTON_ID,
} from '../discord.constants';
import type { LinkProvider, ServicePanel } from './link-provider.interface';

@Injectable()
export class ChzzkProvider implements LinkProvider {
  readonly id = 'chzzk' as const;
  readonly category = 'platform' as const;
  readonly label = '치지직';
  readonly channelNames = {
    register: '치지직-연결',
    log: '치지직-로그',
  };
  readonly linkable = true;
  readonly authService = 'chzzk' as const;
  readonly loginLabel = '치지직 로그인';
  readonly hasGameServers = false;

  buildPanel(): ServicePanel {
    const embed = new EmbedBuilder()
      .setTitle('치지직 채널 연결')
      .setDescription(
        '아래 버튼을 눌러 치지직 계정으로 로그인하면\n' +
          '치지직 채널이 Discord 계정과 연결됩니다.',
      )
      .setColor(0x00ffa3)
      .addFields({
        name: '안내',
        value:
          '· 게임서버에 접속해 있는 동안 후원이 게임으로 전달됩니다.\n' +
          '· 게임 계정도 함께 연결해야 전달 대상을 찾을 수 있습니다.\n' +
          '· 발급되는 링크는 본인만 사용해주세요.',
      });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(buildRegisterButtonId(this.id))
        .setLabel('채널 연결하기')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(LINK_STATUS_BUTTON_ID)
        .setLabel('내 연동 상태')
        .setStyle(ButtonStyle.Secondary),
    );

    return { embeds: [embed], components: [row] };
  }
}
