import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuildServiceConfig } from '../../../common/entities/guild-service.entity';
import { GuildChannelService } from './guild-channel.service';

@Injectable()
export class GuildServiceConfigService {
  constructor(
    @InjectRepository(GuildServiceConfig)
    private readonly repository: Repository<GuildServiceConfig>,
    private readonly guildChannelService: GuildChannelService,
  ) {}

  /**
   * 길드에서 사용 중인 서비스 ID 집합.
   *
   * 행이 없는 서비스는 미사용이지만, 이 기능 도입 전에 채널을 설정해 둔
   * 길드가 갑자기 미사용으로 바뀌지 않도록 채널이 있으면 사용 중으로 본다.
   *
   * 호출부가 이미 채널 맵을 갖고 있으면 넘겨서 중복 조회를 피한다.
   */
  async findEnabled(
    guildId: string,
    knownChannels?: Map<string, string>,
  ): Promise<Set<string>> {
    const rows = await this.repository.find({ where: { guildId } });
    const enabled = new Set(
      rows.filter((row) => row.enabled).map((row) => row.service),
    );

    const known = new Set(rows.map((row) => row.service));
    const channels =
      knownChannels ??
      (await this.guildChannelService.findAllForGuild(guildId));
    for (const key of channels.keys()) {
      const service = key.split(':')[0];
      // 명시적으로 꺼둔 서비스는 폴백 대상에서 제외한다.
      if (!known.has(service)) enabled.add(service);
    }

    return enabled;
  }

  async isEnabled(guildId: string, service: string): Promise<boolean> {
    const row = await this.repository.findOne({ where: { guildId, service } });
    // 명시적 설정이 있으면 그것이 우선한다.
    if (row) return row.enabled;

    // 설정이 없으면 기존 채널 유무로 판단한다(도입 전 길드 호환).
    const channels = await this.guildChannelService.findChannelIds(
      guildId,
      service,
    );
    return channels.length > 0;
  }

  async setEnabled(
    guildId: string,
    service: string,
    category: string,
    enabled: boolean,
  ): Promise<void> {
    await this.repository.save(
      this.repository.create({ guildId, service, category, enabled }),
    );
  }
}
