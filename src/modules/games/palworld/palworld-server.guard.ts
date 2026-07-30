import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { GamePalworldServer } from '../../../common/entities/game-palworld-server.entity';
import { PalworldServerService } from './palworld-server.service';

/** 가드를 통과한 요청에 붙는 게임서버. 컨트롤러가 꺼내 쓴다. */
export interface PalworldServerRequest extends Request {
  palworldServer: GamePalworldServer;
}

/**
 * 모드(GTHttpBridge)가 보내는 요청을 인증한다.
 *
 * X-Server-Id 로 게임서버를 조회한 뒤 X-Server-Key 를 해시 비교한다.
 * 키만으로 식별하면 해시 저장 때문에 전체 대조가 필요해 비효율적이다.
 */
@Injectable()
export class PalworldServerGuard implements CanActivate {
  constructor(private readonly palworldServerService: PalworldServerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PalworldServerRequest>();

    const serverId = Number(request.header('X-Server-Id'));
    const serverKey = request.header('X-Server-Key');

    if (!Number.isInteger(serverId) || serverId <= 0 || !serverKey) {
      throw new UnauthorizedException('인증 정보가 없습니다.');
    }

    const palworldServer = await this.palworldServerService.authenticate(
      serverId,
      serverKey,
    );
    if (!palworldServer) {
      throw new UnauthorizedException('인증에 실패했습니다.');
    }

    request.palworldServer = palworldServer;

    return true;
  }
}
