import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guild } from '../../common/entities/guild.entity';
import { GuildService } from './services/guild.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guild])],
  providers: [GuildService],
  exports: [GuildService],
})
export class GuildModule {}
