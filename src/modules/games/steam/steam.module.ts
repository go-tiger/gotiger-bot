import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../common/entities/user.entity';
import { Steam } from '../../../common/entities/steam.entity';
import { GamePalworld } from '../../../common/entities/game-palworld.entity';
import { SteamApiService } from './steam-api.service';
import { SteamAuthService } from './steam-auth.service';

/**
 * Steam 은 게임이 아니라 계정 제공자다.
 * 팰월드 외의 스팀 게임이 늘어도 인증은 이 모듈이 한 번만 담당한다.
 */
@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([User, Steam, GamePalworld])],
  providers: [SteamApiService, SteamAuthService],
  exports: [SteamApiService, SteamAuthService],
})
export class SteamModule {}
