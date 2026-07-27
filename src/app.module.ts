import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NecordModule } from 'necord';
import { typeOrmConfig } from './common/config/typeorm.config';
import { discordConfig } from './common/config/discord.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    NecordModule.forRootAsync(discordConfig),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
