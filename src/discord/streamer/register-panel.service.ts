import { Injectable } from '@nestjs/common';
import type { SendableChannels } from 'discord.js';
import type { LinkProvider } from '../shared/providers/link-provider.interface';

@Injectable()
export class RegisterPanelService {
  /** 지정한 채널에 해당 서비스의 계정 연결 패널을 게시한다. */
  async post(channel: SendableChannels, provider: LinkProvider): Promise<void> {
    const { embeds, components } = provider.buildPanel();

    await channel.send({ embeds, components });
  }
}
