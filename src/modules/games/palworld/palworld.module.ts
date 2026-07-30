import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Steam } from '../../../common/entities/steam.entity';
import { GameServer } from '../../../common/entities/game-server.entity';
import { GamePalworldServer } from '../../../common/entities/game-palworld-server.entity';
import { SessionModule } from '../../session/session.module';
import { PalworldController } from './palworld.controller';
import { PalworldServerService } from './palworld-server.service';
import { PalworldServerGuard } from './palworld-server.guard';
import { PalworldSessionService } from './palworld-session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Steam, GameServer, GamePalworldServer]),
    SessionModule,
  ],
  controllers: [PalworldController],
  providers: [
    PalworldServerService,
    PalworldServerGuard,
    PalworldSessionService,
  ],
  exports: [PalworldServerService, PalworldSessionService],
})
export class PalworldModule {}
