import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GuildChannel } from '../../../common/entities/guild-channel.entity';
import type {
  ChannelKind,
  ServiceCategory,
  ServiceId,
} from '../../../common/constants/services';

export interface SetChannelInput {
  guildId: string;
  service: ServiceId;
  category: ServiceCategory;
  kind: ChannelKind;
  channelId: string;
}

@Injectable()
export class GuildChannelService {
  constructor(
    @InjectRepository(GuildChannel)
    private readonly repository: Repository<GuildChannel>,
  ) {}

  async set(input: SetChannelInput): Promise<void> {
    await this.repository.save(this.repository.create(input));
  }

  async setMany(inputs: SetChannelInput[]): Promise<void> {
    await this.repository.save(inputs.map((it) => this.repository.create(it)));
  }

  async findChannelId(
    guildId: string,
    service: ServiceId,
    kind: ChannelKind,
  ): Promise<string | null> {
    const row = await this.repository.findOne({
      where: { guildId, service, kind },
    });

    return row?.channelId ?? null;
  }

  /** 길드의 모든 서비스 채널을 `service:kind` 키 맵으로 돌려준다. */
  async findAllForGuild(guildId: string): Promise<Map<string, string>> {
    const rows = await this.repository.find({ where: { guildId } });

    return new Map(
      rows.map((row) => [`${row.service}:${row.kind}`, row.channelId]),
    );
  }

  /** 서비스에 매핑된 채널 ID 목록. 채널 삭제 시 사용한다. */
  async findChannelIds(guildId: string, service: ServiceId): Promise<string[]> {
    const rows = await this.repository.find({ where: { guildId, service } });

    return rows.map((row) => row.channelId);
  }

  async clear(guildId: string, service: ServiceId): Promise<void> {
    await this.repository.delete({
      guildId,
      service,
      kind: In(['register', 'log']),
    });
  }
}
