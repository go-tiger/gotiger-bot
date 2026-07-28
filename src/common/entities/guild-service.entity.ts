import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 길드가 사용하기로 선택한 연동 서비스.
 * enabled 가 true 인 서비스만 /설정 에서 채널을 설정할 수 있다.
 * 클래스명이 GuildService 서비스와 겹치지 않도록 Config 접미사를 붙인다.
 */
@Entity('guild_services')
export class GuildServiceConfig {
  @PrimaryColumn({ type: 'varchar' })
  guildId: string;

  /** 'minecraft' | 'palworld' | 'chzzk' | ... */
  @PrimaryColumn({ type: 'varchar' })
  service: string;

  /** 'game' | 'platform'. 분류 단위 조회를 위해 함께 저장한다. */
  @Column({ type: 'varchar' })
  category: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
