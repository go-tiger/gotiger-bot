import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { encryptedColumn } from '../crypto/encrypted-column.transformer';

/**
 * 치지직 채널 연동. 후원 수신에 필요한 토큰을 보관한다.
 * 후원을 어느 길드에 게시할지는 play_session 이 결정하므로
 * 연동 시점의 길드는 저장하지 않는다.
 */
@Entity('platform_chzzk')
export class PlatformChzzk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** 치지직 채널 ID. /open/v1/users/me 의 channelId. */
  @Column({ type: 'varchar', unique: true })
  channelId: string;

  @Column({ type: 'varchar' })
  channelName: string;

  @Column({ type: 'varchar', transformer: encryptedColumn })
  accessToken: string;

  @Column({ type: 'varchar', transformer: encryptedColumn })
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
