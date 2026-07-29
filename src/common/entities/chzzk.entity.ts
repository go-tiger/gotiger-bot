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

  /**
   * 연결을 진행한 Discord 서버. 후원 이벤트를 어디에 게시할지 판단한다.
   * 소켓 이벤트에는 길드 정보가 없어 연결 시점에 저장해 둔다.
   * 이 컬럼 도입 전에 연결된 행은 값이 없으므로 재연결 전까지 null 이다.
   */
  @Column({ type: 'varchar', nullable: true })
  guildId: string | null;

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
