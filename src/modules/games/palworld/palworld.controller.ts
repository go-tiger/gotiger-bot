import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  PalworldHeartbeatDto,
  PalworldPlayerEventDto,
} from './dto/palworld-player.dto';
import {
  PalworldServerGuard,
  type PalworldServerRequest,
} from './palworld-server.guard';
import { PalworldServerService } from './palworld-server.service';
import { PalworldSessionService } from './palworld-session.service';

/**
 * 팰월드 모드(GTHttpBridge)가 보내는 접속 정보를 받는다.
 *
 * 경로에 /api 접두사를 붙이지 않는다. 모드 설정의
 * GT_BRIDGE_BOT_URL 이 {BASE_URL}/game/palworld 를 가리킨다.
 */
@Controller('game/palworld')
@UseGuards(PalworldServerGuard)
export class PalworldController {
  constructor(
    private readonly palworldServerService: PalworldServerService,
    private readonly palworldSessionService: PalworldSessionService,
  ) {}

  @Post('players/join')
  async join(
    @Req() request: PalworldServerRequest,
    @Body() body: PalworldPlayerEventDto,
  ): Promise<{ ok: true }> {
    await this.palworldSessionService.handleJoin(
      request.palworldServer.gameServerId,
      body.steamId,
      new Date(body.at),
    );

    return { ok: true };
  }

  @Post('players/leave')
  async leave(
    @Req() request: PalworldServerRequest,
    @Body() body: PalworldPlayerEventDto,
  ): Promise<{ ok: true }> {
    await this.palworldSessionService.handleLeave(
      request.palworldServer.gameServerId,
      body.steamId,
      new Date(body.at),
    );

    return { ok: true };
  }

  /**
   * 60초마다 오는 접속자 전체 목록.
   * 모드는 게임서버 조회에 실패한 주기에는 보내지 않으므로,
   * 수신 자체가 게임서버 생존 신호다.
   */
  @Post('heartbeat')
  async heartbeat(
    @Req() request: PalworldServerRequest,
    @Body() body: PalworldHeartbeatDto,
  ): Promise<{ ok: true }> {
    const gameServerId = request.palworldServer.gameServerId;
    const at = new Date(body.at);

    await this.palworldServerService.touchHeartbeat(gameServerId, at);
    await this.palworldSessionService.handleHeartbeat(
      gameServerId,
      body.players.map((player) => player.steamId),
      at,
    );

    return { ok: true };
  }
}
