import { Inject, Injectable } from '@nestjs/common';
import type { GameId } from '../constants/services';
import {
  GAME_SERVER_ADAPTERS,
  type GameServerAdapter,
} from '../interfaces/game-server-adapter.interface';

@Injectable()
export class GameServerAdapterRegistry {
  private readonly byGameMap: Map<GameId, GameServerAdapter>;

  constructor(@Inject(GAME_SERVER_ADAPTERS) adapters: GameServerAdapter[]) {
    this.byGameMap = new Map(
      adapters.map((adapter) => [adapter.game, adapter]),
    );
  }

  /** 미구현 게임의 서버가 등록돼 있을 수 있으므로 없으면 null 을 준다. */
  find(game: GameId): GameServerAdapter | null {
    return this.byGameMap.get(game) ?? null;
  }
}
