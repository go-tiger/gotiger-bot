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
import { User } from './user.entity';
import { GameServer } from './game-server.entity';

export type PlaySessionStatus = 'active' | 'ended';

/**
 * 스트리머가 게임서버에 접속해 있는 동안 유지되는 세션.
 * 후원 라우팅의 중심이다: 후원 → 스트리머 → 활성 세션 → 게임서버.
 *
 * 게임 종류와 무관하게 스트리머당 1개만 활성이다.
 * 부분 유니크 인덱스로 DB 가 이를 보장한다.
 */
@Entity('play_sessions')
@Index(['userId'], { unique: true, where: `status = 'active'` })
@Index(['gameServerId', 'status'])
export class PlaySession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  gameServerId: number;

  @ManyToOne(() => GameServer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_server_id' })
  gameServer: GameServer;

  @Column({ type: 'varchar', default: 'active' })
  status: PlaySessionStatus;

  /** 모드가 보낸 입장 시각. 퇴장 push 의 순서 역전 판정에 쓴다. */
  @Column({ type: 'timestamptz' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
