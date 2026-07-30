import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../common/entities/user.entity';
import { Steam } from '../../common/entities/steam.entity';
import { GamePalworld } from '../../common/entities/game-palworld.entity';
import { PlatformChzzk } from '../../common/entities/platform-chzzk.entity';
import { SessionModule } from '../session/session.module';
import { ChzzkModule } from '../platforms/chzzk/chzzk.module';
import { SteamModule } from '../games/steam/steam.module';
import { LinkStatusService } from './link-status.service';
import { LinkUnlinkService } from './link-unlink.service';

/**
 * 스트리머의 연동 현황 조회와 해제를 모은다.
 * 여러 서비스에 흩어진 상태를 한곳에서 다루기 위한 모듈이다.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Steam, GamePalworld, PlatformChzzk]),
    SessionModule,
    ChzzkModule,
    SteamModule,
  ],
  providers: [LinkStatusService, LinkUnlinkService],
  exports: [LinkStatusService, LinkUnlinkService],
})
export class LinkModule {}
