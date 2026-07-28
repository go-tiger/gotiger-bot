import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GuildChannel } from '../../../common/entities/guild-channel.entity';
import { GuildService } from './guild.service';

export type ChannelKind = 'register' | 'log';

export interface SetChannelInput {
  guildId: string;
  service: string;
  category: string;
  kind: ChannelKind;
  channelId: string;
}

@Injectable()
export class GuildChannelService {
  constructor(
    @InjectRepository(GuildChannel)
    private readonly repository: Repository<GuildChannel>,
    private readonly guildService: GuildService,
  ) {}

  async set(input: SetChannelInput): Promise<void> {
    await this.repository.save(this.repository.create(input));
  }

  async setMany(inputs: SetChannelInput[]): Promise<void> {
    await this.repository.save(inputs.map((it) => this.repository.create(it)));
  }

  /**
   * 서비스의 채널 ID를 찾는다.
   * 신규 테이블에 없으면 마인크래프트에 한해 구 guilds 컬럼으로 폴백해
   * 기존 서버의 설정이 유지되도록 한다.
   */
  async findChannelId(
    guildId: string,
    service: string,
    kind: ChannelKind,
  ): Promise<string | null> {
    const row = await this.repository.findOne({
      where: { guildId, service, kind },
    });
    if (row) return row.channelId;

    if (service !== 'minecraft') return null;

    const guild = await this.guildService.findOne(guildId);
    return kind === 'register'
      ? (guild?.registerChannelId ?? null)
      : (guild?.logChannelId ?? null);
  }

  /** 길드의 모든 서비스 채널을 `service:kind` 키 맵으로 돌려준다. */
  async findAllForGuild(guildId: string): Promise<Map<string, string>> {
    const rows = await this.repository.find({ where: { guildId } });
    const map = new Map(
      rows.map((row) => [`${row.service}:${row.kind}`, row.channelId]),
    );

    // 구 컬럼 폴백은 신규 행이 없을 때만 적용한다.
    const guild = await this.guildService.findOne(guildId);
    if (guild?.registerChannelId && !map.has('minecraft:register')) {
      map.set('minecraft:register', guild.registerChannelId);
    }
    if (guild?.logChannelId && !map.has('minecraft:log')) {
      map.set('minecraft:log', guild.logChannelId);
    }

    return map;
  }

  /** 서비스에 매핑된 채널 ID 목록. 채널 삭제 시 사용한다. */
  async findChannelIds(guildId: string, service: string): Promise<string[]> {
    const rows = await this.repository.find({ where: { guildId, service } });
    const ids = rows.map((row) => row.channelId);

    if (service === 'minecraft') {
      const guild = await this.guildService.findOne(guildId);
      for (const id of [guild?.registerChannelId, guild?.logChannelId]) {
        if (id && !ids.includes(id)) ids.push(id);
      }
    }

    return ids;
  }

  async clear(guildId: string, service: string): Promise<void> {
    await this.repository.delete({
      guildId,
      service,
      kind: In(['register', 'log']),
    });

    // 구 컬럼이 남아 있으면 폴백으로 되살아나므로 함께 비운다.
    if (service === 'minecraft') {
      await this.guildService.clearChannels(guildId);
    }
  }
}
