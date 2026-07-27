import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guild } from '../../../common/entities/guild.entity';

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
}
