import { Module } from '@nestjs/common';
import { SteamModule } from './steam/steam.module';
import { MinecraftModule } from './minecraft/minecraft.module';
import { PalworldModule } from './palworld/palworld.module';

/** 게임 서버 연동을 묶는다. 실제 구현은 각 하위 모듈에 있다. */
@Module({
  imports: [SteamModule, MinecraftModule, PalworldModule],
  exports: [SteamModule, MinecraftModule, PalworldModule],
})
export class GamesModule {}
