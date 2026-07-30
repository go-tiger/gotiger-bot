import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Steam } from './steam.entity';

/**
 * 팰월드 계정. Steam 인증 결과에 게임 소유 여부만 얹는다.
 * 후원 라우팅은 Steam.steamId 로 하므로 여기에 식별자를 두지 않는다.
 */
@Entity('game_palworld')
export class GamePalworld {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  steamRefId: number;

  @OneToOne(() => Steam, (steam) => steam.palworld, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'steam_ref_id' })
  steam: Steam;

  /** Steam Web API 로 확인한 소유 여부. 프로필이 비공개면 false 로 남는다. */
  @Column({ type: 'boolean', default: false })
  owned: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
