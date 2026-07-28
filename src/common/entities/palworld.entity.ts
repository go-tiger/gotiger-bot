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

@Entity('palworlds')
export class Palworld {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  steamId: number;

  @OneToOne(() => Steam, (steam) => steam.palworld, { onDelete: 'CASCADE' })
  @JoinColumn()
  steam: Steam;

  @Column({ type: 'boolean', default: false })
  owned: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
