import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 봇이 들어가 있는 Discord 서버.
 * 채널 설정은 guild_channels 가 행 단위로 갖는다.
 */
@Entity('guilds')
export class Guild {
  @PrimaryColumn({ type: 'varchar' })
  guildId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
