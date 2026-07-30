import { Injectable } from '@nestjs/common';
import { EmbedBuilder } from 'discord.js';
import type { LinkProvider, ServicePanel } from './link-provider.interface';

/** 아직 연동을 구현하지 않았다. /설정 에서 "준비 중"으로만 노출된다. */
@Injectable()
export class MinecraftProvider implements LinkProvider {
  readonly id = 'minecraft' as const;
  readonly category = 'game' as const;
  readonly label = '마인크래프트';
  readonly channelNames = {
    register: '마인크래프트-등록',
    log: '마인크래프트-로그',
  };
  readonly linkable = false;
  readonly hasGameServers = false;

  buildPanel(): ServicePanel {
    const embed = new EmbedBuilder()
      .setTitle('마인크래프트 계정 연결')
      .setDescription('아직 준비 중입니다.')
      .setColor(0x5865f2);

    return { embeds: [embed], components: [] };
  }
}
