import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlatformsModule } from './modules/platforms/platforms.module';
import { GamesModule } from './modules/games/games.module';
import { AuthModule } from './modules/auth/auth.module';
import { GuildModule } from './modules/guild/guild.module';
import { DiscordModule } from './discord/discord.module';

@Module({
  imports: [PlatformsModule, GamesModule, AuthModule, GuildModule, DiscordModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
