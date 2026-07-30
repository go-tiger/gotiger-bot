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

/**
 * 마인크래프트 계정. Microsoft 로그인으로 얻은 프로필을 담는다.
 * 이번 범위에서는 연동만 두고 게임서버 연동은 구현하지 않는다.
 */
@Entity('game_minecraft')
export class GameMinecraft {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', unique: true })
  uuid: string;

  @Column({ type: 'varchar' })
  username: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
