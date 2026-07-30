import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { Steam } from '../../../common/entities/steam.entity';
import type {
  DonationDeliveryResult,
  DonationPayload,
  GameServerAdapter,
} from '../../../common/interfaces/game-server-adapter.interface';
import { PalworldServerService } from './palworld-server.service';

/** 후원은 실시간성이 중요하다. 오래 매달리지 않고 포기한다. */
const REQUEST_TIMEOUT_MS = 5_000;

/**
 * 팰월드 모드(GTHttpBridge)에 후원을 전달한다.
 *
 * 모드의 Python 서버가 SteamID64 로 플레이어를 찾고,
 * 금액 구간에 따라 실행할 액션을 스스로 결정한다.
 * 봇은 판단하지 않고 그대로 넘긴다.
 */
@Injectable()
export class PalworldAdapter implements GameServerAdapter {
  readonly game = 'palworld' as const;

  private readonly logger = new Logger(PalworldAdapter.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly palworldServerService: PalworldServerService,
    @InjectRepository(Steam)
    private readonly steamRepository: Repository<Steam>,
  ) {}

  async resolvePlayerId(userId: number): Promise<string | null> {
    const steam = await this.steamRepository.findOne({ where: { userId } });

    return steam?.steamId ?? null;
  }

  async deliverDonation(
    gameServerId: number,
    payload: DonationPayload,
  ): Promise<DonationDeliveryResult> {
    const server = await this.palworldServerService.findOne(gameServerId);
    if (!server) {
      return { status: 'failed', reason: '게임서버 정보를 찾을 수 없습니다.' };
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          `${server.baseUrl}/donation`,
          {
            steamId: payload.playerId,
            streamerName: payload.streamerName,
            platform: payload.platform,
            donationType: payload.donationType,
            amount: payload.amount,
            message: payload.message,
            donorName: payload.donorName,
            donatedAt: payload.donatedAt.toISOString(),
          },
          {
            headers: {
              'X-API-Key': server.botKey,
              'Content-Type': 'application/json',
            },
            timeout: REQUEST_TIMEOUT_MS,
          },
        ),
      );

      return { status: 'delivered' };
    } catch (error) {
      // 404 는 '그 플레이어가 접속해 있지 않다'는 뜻이라 세션을 닫아야 한다.
      if (error instanceof AxiosError && error.response?.status === 404) {
        return { status: 'player-absent' };
      }

      const reason =
        error instanceof AxiosError
          ? `${error.response?.status ?? error.code ?? 'unknown'}`
          : '알 수 없는 오류';

      this.logger.error(
        `팰월드 후원 전달 실패: gameServerId=${gameServerId} reason=${reason}`,
      );

      return { status: 'failed', reason };
    }
  }
}
