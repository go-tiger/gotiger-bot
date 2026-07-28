import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 길드별 · 서비스별 채널 매핑.
 * 서비스가 늘어나도 컬럼을 추가하지 않도록 행 단위로 저장한다.
 */
@Entity('guild_channels')
export class GuildChannel {
  @PrimaryColumn({ type: 'varchar' })
  guildId: string;

  /** 'minecraft' | 'palworld' | ... */
  @PrimaryColumn({ type: 'varchar' })
  service: string;

  /** 'register' | 'log' */
  @PrimaryColumn({ type: 'varchar' })
  kind: string;

  /** 'game' | 'platform'. 분류 단위 조회를 위해 함께 저장한다. */
  @Column({ type: 'varchar' })
  category: string;

  @Column({ type: 'varchar' })
  channelId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
