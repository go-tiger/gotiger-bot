import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('chzzks')
export class Chzzk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  userId: number;

  @OneToOne(() => User, (user) => user.chzzk, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  /** 치지직 채널 ID. /open/v1/users/me 의 channelId. */
  @Column({ type: 'varchar', unique: true })
  channelId: string;

  @Column({ type: 'varchar' })
  channelName: string;

  @Column({ type: 'varchar' })
  accessToken: string;

  @Column({ type: 'varchar' })
  refreshToken: string;

  /** 'Bearer' 등. 요청 헤더 구성에 그대로 쓴다. */
  @Column({ type: 'varchar' })
  tokenType: string;

  /** 갱신 대상 조회에 쓰이므로 만료 시각을 계산해 저장한다. */
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'varchar', nullable: true })
  scope: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
