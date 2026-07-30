import { Module } from '@nestjs/common';
import { SessionModule } from '../session/session.module';
import { PalworldModule } from '../games/palworld/palworld.module';
import { PalworldAdapter } from '../games/palworld/palworld.adapter';
import {
  GAME_SERVER_ADAPTERS,
  type GameServerAdapter,
} from '../../common/interfaces/game-server-adapter.interface';
import { GameServerAdapterRegistry } from '../../common/registries/game-server-adapter.registry';
import { DonationRouterService } from './donation-router.service';

/**
 * 새 게임을 붙일 때는 어댑터를 만들어 이 배열에만 추가한다.
 * 라우팅 로직은 게임을 알지 못한다.
 */
const gameServerAdapters = [PalworldAdapter];

@Module({
  imports: [SessionModule, PalworldModule],
  providers: [
    {
      provide: GAME_SERVER_ADAPTERS,
      useFactory: (...adapters: GameServerAdapter[]) => adapters,
      inject: gameServerAdapters,
    },
    GameServerAdapterRegistry,
    DonationRouterService,
  ],
  exports: [GameServerAdapterRegistry],
})
export class DonationModule {}
