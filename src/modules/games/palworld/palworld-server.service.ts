import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GameServer } from '../../../common/entities/game-server.entity';
import { GamePalworldServer } from '../../../common/entities/game-palworld-server.entity';
import {
  generateKey,
  hashKey,
  verifyKey,
} from '../../../common/crypto/crypto.util';

/** 등록·재발급 직후 한 번만 보여줄 키. 저장 형태와 다르다. */
export interface IssuedKeys {
  serverId: number;
  /** 모드 → 봇 인증용. 봇은 해시만 갖는다. */
  serverKey: string;
  /** 봇 → 모드 인증용. 모드 설정의 GT_BRIDGE_API_KEY 와 같아야 한다. */
  botKey: string;
}

export interface PalworldServerView {
  gameServer: GameServer;
  palworld: GamePalworldServer;
}

@Injectable()
export class PalworldServerService {
  private readonly logger = new Logger(PalworldServerService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(GameServer)
    private readonly gameServerRepository: Repository<GameServer>,
    @InjectRepository(GamePalworldServer)
    private readonly palworldRepository: Repository<GamePalworldServer>,
  ) {}

  /**
   * 게임서버를 등록하고 양방향 키를 발급한다.
   * 반환된 키는 서버장에게 한 번만 보여주고 다시 조회할 수 없다.
   */
  async register(
    guildId: string,
    name: string,
    baseUrl: string,
    botKey?: string,
  ): Promise<IssuedKeys> {
    const serverKey = generateKey();
    const issuedBotKey = botKey ?? generateKey();

    const gameServer = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(
        manager.create(GameServer, {
          guildId,
          game: 'palworld',
          name,
          enabled: true,
        }),
      );

      await manager.save(
        manager.create(GamePalworldServer, {
          gameServerId: created.id,
          baseUrl: PalworldServerService.normalizeBaseUrl(baseUrl),
          botKey: issuedBotKey,
          serverKeyHash: hashKey(serverKey),
        }),
      );

      return created;
    });

    this.logger.log(
      `팰월드 서버 등록: guildId=${guildId} serverId=${gameServer.id} name=${name}`,
    );

    return { serverId: gameServer.id, serverKey, botKey: issuedBotKey };
  }

  async findByGuild(guildId: string): Promise<PalworldServerView[]> {
    const gameServers = await this.gameServerRepository.find({
      where: { guildId, game: 'palworld' },
      order: { id: 'ASC' },
    });
    if (gameServers.length === 0) return [];

    const views: PalworldServerView[] = [];
    for (const gameServer of gameServers) {
      const palworld = await this.palworldRepository.findOne({
        where: { gameServerId: gameServer.id },
      });
      if (palworld) views.push({ gameServer, palworld });
    }

    return views;
  }

  findOne(gameServerId: number): Promise<GamePalworldServer | null> {
    return this.palworldRepository.findOne({
      where: { gameServerId },
      relations: ['gameServer'],
    });
  }

  async update(
    gameServerId: number,
    changes: { name?: string; baseUrl?: string },
  ): Promise<void> {
    const palworld = await this.findOne(gameServerId);
    if (!palworld) throw new NotFoundException('게임서버를 찾을 수 없습니다.');

    if (changes.name) {
      await this.gameServerRepository.update(gameServerId, {
        name: changes.name,
      });
    }

    if (changes.baseUrl) {
      palworld.baseUrl = PalworldServerService.normalizeBaseUrl(
        changes.baseUrl,
      );
      await this.palworldRepository.save(palworld);
    }
  }

  /** 이전 키는 즉시 무효가 된다. 서버장이 모드 설정을 갱신해야 한다. */
  async reissueKeys(gameServerId: number): Promise<IssuedKeys> {
    const palworld = await this.findOne(gameServerId);
    if (!palworld) throw new NotFoundException('게임서버를 찾을 수 없습니다.');

    const serverKey = generateKey();
    const botKey = generateKey();

    palworld.serverKeyHash = hashKey(serverKey);
    palworld.botKey = botKey;
    await this.palworldRepository.save(palworld);

    this.logger.log(`팰월드 서버 키 재발급: serverId=${gameServerId}`);

    return { serverId: gameServerId, serverKey, botKey };
  }

  /** 세션 정리는 호출하는 쪽에서 먼저 한다. */
  async remove(gameServerId: number): Promise<void> {
    await this.gameServerRepository.delete(gameServerId);
    this.logger.log(`팰월드 서버 삭제: serverId=${gameServerId}`);
  }

  /**
   * 모드 요청의 X-Server-Id / X-Server-Key 를 검증한다.
   * serverId 로 먼저 조회하므로 전체 대조가 필요 없다.
   */
  async authenticate(
    serverId: number,
    serverKey: string,
  ): Promise<GamePalworldServer | null> {
    const palworld = await this.findOne(serverId);
    if (!palworld) return null;

    if (!verifyKey(serverKey, palworld.serverKeyHash)) return null;
    if (!palworld.gameServer?.enabled) return null;

    return palworld;
  }

  /** heartbeat 수신 시각을 기록한다. 만료 판정과 상태 표시에 쓴다. */
  async touchHeartbeat(gameServerId: number, at: Date): Promise<void> {
    await this.palworldRepository.update(gameServerId, {
      lastHeartbeatAt: at,
    });
  }

  /** 뒤에 경로를 붙일 것이므로 끝의 슬래시를 떼어 둔다. */
  private static normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.trim().replace(/\/+$/, '');
  }
}
