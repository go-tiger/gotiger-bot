import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuildServiceConfig } from '../../../common/entities/guild-service.entity';
import type {
  ServiceCategory,
  ServiceId,
} from '../../../common/constants/services';

@Injectable()
export class GuildServiceConfigService {
  constructor(
    @InjectRepository(GuildServiceConfig)
    private readonly repository: Repository<GuildServiceConfig>,
  ) {}

  /** 길드에서 사용 중인 서비스 ID 집합. */
  async findEnabled(guildId: string): Promise<Set<string>> {
    const rows = await this.repository.find({ where: { guildId } });

    return new Set(rows.filter((row) => row.enabled).map((row) => row.service));
  }

  async isEnabled(guildId: string, service: ServiceId): Promise<boolean> {
    const row = await this.repository.findOne({ where: { guildId, service } });

    return row?.enabled ?? false;
  }

  async setEnabled(
    guildId: string,
    service: ServiceId,
    category: ServiceCategory,
    enabled: boolean,
  ): Promise<void> {
    await this.repository.save(
      this.repository.create({ guildId, service, category, enabled }),
    );
  }
}
