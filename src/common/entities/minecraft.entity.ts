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

@Entity('minecrafts')
export class Minecraft {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  userId: number;

  @OneToOne(() => User, (user) => user.minecraft, { onDelete: 'CASCADE' })
  @JoinColumn()
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
