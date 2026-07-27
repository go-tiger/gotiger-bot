import { Injectable } from '@nestjs/common';
import {
  ChannelType,
  PermissionFlagsBits,
  type Guild as DiscordGuild,
  type TextChannel,
} from 'discord.js';
import {
  CATEGORY_NAME,
  LOG_CHANNEL_NAME,
  REGISTER_CHANNEL_NAME,
} from '../discord.constants';

export interface CreatedChannels {
  registerChannel: TextChannel;
  logChannel: TextChannel;
}

@Injectable()
export class ChannelSetupService {
  /** 카테고리와 등록/로그 채널을 생성한다. */
  async createChannels(guild: DiscordGuild): Promise<CreatedChannels> {
    const category = await guild.channels.create({
      name: CATEGORY_NAME,
      type: ChannelType.GuildCategory,
    });

    const registerChannel = await guild.channels.create({
      name: REGISTER_CHANNEL_NAME,
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
      name: LOG_CHANNEL_NAME,
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
}
