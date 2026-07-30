import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NecordModule } from 'necord';
import { typeOrmConfig } from './common/config/typeorm.config';
import { discordConfig } from './common/config/discord.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlatformsModule } from './modules/platforms/platforms.module';
import { GamesModule } from './modules/games/games.module';
import { AuthModule } from './modules/auth/auth.module';
import { GuildModule } from './modules/guild/guild.module';
import { SessionModule } from './modules/session/session.module';
import { DonationModule } from './modules/donation/donation.module';
import { DiscordModule } from './discord/discord.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    NecordModule.forRootAsync(discordConfig),
    PlatformsModule,
    GamesModule,
    AuthModule,
    GuildModule,
    SessionModule,
    DonationModule,
    DiscordModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
