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

  /** 게임서버 등록처럼 FK 가 걸리는 작업 전에 길드 행을 보장한다. */
  async ensure(guildId: string): Promise<Guild> {
    const existing = await this.findOne(guildId);
    if (existing) return existing;

    return this.guildRepository.save(this.guildRepository.create({ guildId }));
  }
}
