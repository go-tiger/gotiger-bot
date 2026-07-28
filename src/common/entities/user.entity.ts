import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Minecraft } from './minecraft.entity';
import { Steam } from './steam.entity';
import { Chzzk } from './chzzk.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  discordId: string;

  @OneToOne(() => Minecraft, (minecraft) => minecraft.user)
  minecraft: Minecraft;

  @OneToOne(() => Steam, (steam) => steam.user)
  steam: Steam;

  @OneToOne(() => Chzzk, (chzzk) => chzzk.user)
  chzzk: Chzzk;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
