import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guild } from '../../common/entities/guild.entity';
import { GuildChannel } from '../../common/entities/guild-channel.entity';
import { GuildServiceConfig } from '../../common/entities/guild-service.entity';
import { GuildService } from './services/guild.service';
import { GuildChannelService } from './services/guild-channel.service';
import { GuildServiceConfigService } from './services/guild-service-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Guild, GuildChannel, GuildServiceConfig]),
  ],
  providers: [GuildService, GuildChannelService, GuildServiceConfigService],
  exports: [GuildService, GuildChannelService, GuildServiceConfigService],
})
export class GuildModule {}
