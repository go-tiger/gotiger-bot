import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../common/entities/user.entity';
import { Steam } from '../../common/entities/steam.entity';
import { GamePalworld } from '../../common/entities/game-palworld.entity';
import { PlatformChzzk } from '../../common/entities/platform-chzzk.entity';
import { PlaySessionService } from '../session/play-session.service';

export interface LinkStatus {
  chzzk: { channelName: string } | null;
  steam: { personaName: string; ownsPalworld: boolean } | null;
  session: { serverName: string; startedAt: Date } | null;
}

/**
 * 스트리머 본인의 연동 현황을 모아 보여준다.
 * 여러 서비스에 흩어진 상태를 한 화면에 담기 위한 조회 전용 서비스다.
 */
@Injectable()
export class LinkStatusService {
  constructor(
    private readonly playSessionService: PlaySessionService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Steam)
    private readonly steamRepository: Repository<Steam>,
    @InjectRepository(GamePalworld)
    private readonly palworldRepository: Repository<GamePalworld>,
    @InjectRepository(PlatformChzzk)
    private readonly chzzkRepository: Repository<PlatformChzzk>,
  ) {}

  async find(discordId: string): Promise<LinkStatus> {
    const empty: LinkStatus = { chzzk: null, steam: null, session: null };

    const user = await this.userRepository.findOne({ where: { discordId } });
    if (!user) return empty;

    const chzzk = await this.chzzkRepository.findOne({
      where: { userId: user.id },
    });
    const steam = await this.steamRepository.findOne({
      where: { userId: user.id },
    });

    let steamStatus: LinkStatus['steam'] = null;
    if (steam) {
      const palworld = await this.palworldRepository.findOne({
        where: { steamRefId: steam.id },
      });
      steamStatus = {
        personaName: steam.personaName,
        ownsPalworld: palworld?.owned ?? false,
      };
    }

    const session = await this.playSessionService.findActiveWithServer(user.id);

    return {
      chzzk: chzzk ? { channelName: chzzk.channelName } : null,
      steam: steamStatus,
      session: session?.gameServer
        ? {
            serverName: session.gameServer.name,
            startedAt: session.startedAt,
          }
        : null,
    };
  }
}
