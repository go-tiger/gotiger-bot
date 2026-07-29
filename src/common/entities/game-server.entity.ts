import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Guild } from './guild.entity';
import type { GameId } from '../constants/services';

/**
 * 길드에 등록된 게임서버의 공통 정보.
 * 게임별 접속 정보는 game_{게임}_servers 가 1:1 로 확장한다.
 *
 * play_session 이 이 테이블만 참조하므로 게임이 늘어도 세션 로직은 그대로다.
 */
@Entity('game_servers')
@Index(['guildId', 'game'])
export class GameServer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  guildId: string;

  @ManyToOne(() => Guild, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guild_id' })
  guild: Guild;

  @Column({ type: 'varchar' })
  game: GameId;

  /** 서버장이 붙이는 표시용 이름. */
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
