import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';
import { GamePalworld } from './game-palworld.entity';

/**
 * Steam 계정. 게임도 플랫폼도 아닌 계정 제공자라 프리픽스를 붙이지 않는다.
 * 스팀 기반 게임이 늘어도 인증은 한 번만 하면 된다.
 */
@Entity('steams')
export class Steam {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** SteamID64. 팰월드 모드가 보내오는 식별자와 그대로 매칭한다. */
  @Column({ type: 'varchar', unique: true })
  steamId: string;

  @Column({ type: 'varchar' })
  personaName: string;

  @OneToOne(() => GamePalworld, (palworld) => palworld.steam)
  palworld: GamePalworld;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
