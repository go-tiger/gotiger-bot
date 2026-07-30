import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaySession } from '../../common/entities/play-session.entity';
import { GameServer } from '../../common/entities/game-server.entity';
import { GamePalworldServer } from '../../common/entities/game-palworld-server.entity';
import { PlaySessionService } from './play-session.service';
import { SessionExpiryService } from './session-expiry.service';

/** 스트리머의 게임 접속 상태를 관리한다. 후원 라우팅의 근거가 된다. */
@Module({
  imports: [
    TypeOrmModule.forFeature([PlaySession, GameServer, GamePalworldServer]),
  ],
  providers: [PlaySessionService, SessionExpiryService],
  exports: [PlaySessionService],
})
export class SessionModule {}
