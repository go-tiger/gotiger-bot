import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('guilds')
export class Guild {
  @PrimaryColumn({ type: 'varchar' })
  guildId: string;

  @Column({ type: 'varchar', nullable: true })
  registerChannelId: string | null;

  @Column({ type: 'varchar', nullable: true })
  logChannelId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
