import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  ChannelKind,
  ServiceCategory,
  ServiceId,
} from '../constants/services';

/**
 * 길드별 · 서비스별 채널 매핑.
 * 서비스가 늘어나도 컬럼을 추가하지 않도록 행 단위로 저장한다.
 */
@Entity('guild_channels')
export class GuildChannel {
  @PrimaryColumn({ type: 'varchar' })
  guildId: string;

  @PrimaryColumn({ type: 'varchar' })
  service: ServiceId;

  @PrimaryColumn({ type: 'varchar' })
  kind: ChannelKind;

  /** 분류 단위 조회를 위해 함께 저장한다. */
  @Column({ type: 'varchar' })
  category: ServiceCategory;

  @Column({ type: 'varchar' })
  channelId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
