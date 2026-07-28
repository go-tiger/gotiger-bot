import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guild } from '../../common/entities/guild.entity';

@Injectable()
export class GuildService {
  constructor(
    @InjectRepository(Guild)
    private readonly guildRepository: Repository<Guild>,
  ) {}

  findOne(guildId: string): Promise<Guild | null> {
    return this.guildRepository.findOne({ where: { guildId } });
  }

  async setChannels(
    guildId: string,
    channels: { registerChannelId?: string; logChannelId?: string },
  ): Promise<Guild> {
    const guild =
      (await this.findOne(guildId)) ??
      this.guildRepository.create({
        guildId,
        registerChannelId: null,
        logChannelId: null,
      });

    if (channels.registerChannelId !== undefined) {
      guild.registerChannelId = channels.registerChannelId;
    }
    if (channels.logChannelId !== undefined) {
      guild.logChannelId = channels.logChannelId;
    }

    return this.guildRepository.save(guild);
  }

  /** 구 채널 컬럼을 비운다. 마인크래프트 폴백을 끊을 때 사용한다. */
  async clearChannels(guildId: string): Promise<void> {
    const guild = await this.findOne(guildId);
    if (!guild) return;

    guild.registerChannelId = null;
    guild.logChannelId = null;
    await this.guildRepository.save(guild);
  }
}
