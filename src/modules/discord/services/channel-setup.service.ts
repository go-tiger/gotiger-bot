import { Injectable } from '@nestjs/common';
import {
  ChannelType,
  PermissionFlagsBits,
  type CategoryChannel,
  type Guild as DiscordGuild,
  type TextChannel,
} from 'discord.js';
import {
  CATEGORY_CHANNEL_NAMES,
  type LinkProvider,
} from '../providers/link-provider.interface';

export interface CreatedChannels {
  registerChannel: TextChannel;
  logChannel: TextChannel;
}

@Injectable()
export class ChannelSetupService {
  /** 서비스의 등록/로그 채널을 분류 카테고리 아래에 생성한다. */
  async createChannels(
    guild: DiscordGuild,
    provider: LinkProvider,
  ): Promise<CreatedChannels> {
    const category = await this.ensureCategory(guild, provider);

    const registerChannel = await guild.channels.create({
      name: provider.channelNames.register,
      type: ChannelType.GuildText,
      parent: category,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionFlagsBits.SendMessages],
          allow: [PermissionFlagsBits.ViewChannel],
        },
      ],
    });

    const logChannel = await guild.channels.create({
      name: provider.channelNames.log,
      type: ChannelType.GuildText,
      parent: category,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionFlagsBits.ViewChannel],
        },
      ],
    });

    return { registerChannel, logChannel };
  }

  /**
   * 분류 카테고리는 서비스끼리 공유한다.
   * 같은 이름의 카테고리가 이미 있으면 재사용하고, 없을 때만 새로 만든다.
   */
  private async ensureCategory(
    guild: DiscordGuild,
    provider: LinkProvider,
  ): Promise<CategoryChannel> {
    const name = CATEGORY_CHANNEL_NAMES[provider.category];

    const existing = guild.channels.cache.find(
      (channel): channel is CategoryChannel =>
        channel.type === ChannelType.GuildCategory && channel.name === name,
    );
    if (existing) return existing;

    return guild.channels.create({
      name,
      type: ChannelType.GuildCategory,
    });
  }
}
