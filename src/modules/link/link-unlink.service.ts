import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../common/entities/user.entity';
import { ChzzkAuthService } from '../platforms/chzzk/chzzk-auth.service';
import { SteamAuthService } from '../games/steam/steam-auth.service';
import { PlaySessionService } from '../session/play-session.service';
import type { AuthServiceId } from '../../common/constants/services';

/**
 * 연동을 해제한다.
 *
 * 해제하면 후원을 전달할 곳이 없어지므로 활성 세션을 먼저 닫는다.
 * 세션 종료 이벤트가 소켓까지 즉시 정리한다.
 */
@Injectable()
export class LinkUnlinkService {
  private readonly logger = new Logger(LinkUnlinkService.name);

  constructor(
    private readonly chzzkAuthService: ChzzkAuthService,
    private readonly steamAuthService: SteamAuthService,
    private readonly playSessionService: PlaySessionService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async unlink(discordId: string, service: AuthServiceId): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { discordId } });
    if (!user) return false;

    // 세션을 먼저 닫아야 남은 후원이 엉뚱하게 전달되지 않는다.
    await this.playSessionService.endByUser(user.id, 'unlinked');

    const removed = await this.remove(discordId, service);
    if (removed) {
      this.logger.log(`연동 해제: discordId=${discordId} service=${service}`);
    }

    return removed;
  }

  private async remove(
    discordId: string,
    service: AuthServiceId,
  ): Promise<boolean> {
    if (service === 'chzzk') {
      return (await this.chzzkAuthService.unlink(discordId)) !== null;
    }

    if (service === 'steam') {
      return (await this.steamAuthService.unlink(discordId)) !== null;
    }

    return false;
  }
}
