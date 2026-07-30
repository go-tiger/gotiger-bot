import { Injectable } from '@nestjs/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { PalworldServerService } from '../../modules/games/palworld/palworld-server.service';
import { PlaySessionService } from '../../modules/session/play-session.service';
import {
  buildCategoryButtonId,
  buildGameServerAddId,
  buildGameServerEditId,
  buildGameServerReissueId,
  buildGameServerRemoveId,
  buildGameServerSelectId,
} from '../shared/discord.constants';

/** 이 시간 안에 heartbeat 가 있었으면 연결된 것으로 표시한다. */
const ONLINE_WINDOW_MS = 180_000;

/** 버튼 한 행에 담을 수 있는 수를 넘으면 셀렉트 메뉴로 바꾼다. */
const MAX_BUTTON_SERVERS = 5;

export interface PanelView {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[];
}

/**
 * 팰월드 게임서버 목록과 관리 버튼을 그린다.
 * 서버장만 접근하며, 발급된 키는 여기서 보여주지 않는다.
 */
@Injectable()
export class GameServerPanelService {
  constructor(
    private readonly palworldServerService: PalworldServerService,
    private readonly playSessionService: PlaySessionService,
  ) {}

  async buildList(guildId: string): Promise<PanelView> {
    const servers = await this.palworldServerService.findByGuild(guildId);

    const embed = new EmbedBuilder()
      .setTitle('🎮 팰월드 게임서버')
      .setColor(0x1b2838);

    const rows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] =
      [];

    if (servers.length === 0) {
      embed.setDescription(
        '등록된 게임서버가 없습니다.\n' +
          '아래 버튼으로 모드가 설치된 서버를 등록해주세요.',
      );
    } else {
      const lines: string[] = [];
      for (const { gameServer, palworld } of servers) {
        const sessions = await this.playSessionService.findActiveByServer(
          gameServer.id,
        );
        const online = this.isOnline(palworld.lastHeartbeatAt);

        lines.push(
          `${online ? '🟢' : '🔴'} **${gameServer.name}** (ID: ${gameServer.id})\n` +
            `> ${palworld.baseUrl}\n` +
            `> 접속 스트리머 ${sessions.length}명 · ` +
            `${this.formatHeartbeat(palworld.lastHeartbeatAt)}`,
        );
      }

      embed.setDescription(lines.join('\n\n'));

      // 서버가 많아지면 버튼 한 행을 넘기므로 셀렉트로 바꾼다.
      if (servers.length > MAX_BUTTON_SERVERS) {
        rows.push(
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(buildGameServerSelectId('palworld'))
              .setPlaceholder('관리할 서버를 선택하세요')
              .addOptions(
                servers.slice(0, 25).map(({ gameServer, palworld }) => ({
                  label: gameServer.name,
                  description: palworld.baseUrl.slice(0, 100),
                  value: String(gameServer.id),
                })),
              ),
          ),
        );
      } else {
        rows.push(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            servers.map(({ gameServer }) =>
              new ButtonBuilder()
                .setCustomId(buildGameServerEditId('palworld', gameServer.id))
                .setLabel(gameServer.name.slice(0, 80))
                .setStyle(ButtonStyle.Secondary),
            ),
          ),
        );
      }
    }

    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(buildGameServerAddId('palworld'))
          .setLabel('서버 등록')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(buildCategoryButtonId('game'))
          .setLabel('← 뒤로')
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    return { embeds: [embed], components: rows };
  }

  /** 서버 하나를 고른 뒤의 관리 화면. */
  async buildDetail(gameServerId: number): Promise<PanelView | null> {
    const palworld = await this.palworldServerService.findOne(gameServerId);
    if (!palworld?.gameServer) return null;

    const sessions =
      await this.playSessionService.findActiveByServer(gameServerId);
    const online = this.isOnline(palworld.lastHeartbeatAt);

    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${palworld.gameServer.name}`)
      .setColor(online ? 0x57f287 : 0xed4245)
      .addFields(
        { name: '서버 ID', value: String(gameServerId), inline: true },
        {
          name: '상태',
          value: online ? '🟢 연결됨' : '🔴 신호 없음',
          inline: true,
        },
        {
          name: '접속 스트리머',
          value: `${sessions.length}명`,
          inline: true,
        },
        { name: '모드 주소', value: palworld.baseUrl },
        {
          name: '마지막 신호',
          value: this.formatHeartbeat(palworld.lastHeartbeatAt),
        },
      );

    return {
      embeds: [embed],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(buildGameServerEditId('palworld', gameServerId))
            .setLabel('수정')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(buildGameServerReissueId('palworld', gameServerId))
            .setLabel('키 재발급')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(buildGameServerRemoveId('palworld', gameServerId))
            .setLabel('삭제')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('gs/home/palworld')
            .setLabel('← 목록')
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
    };
  }

  private isOnline(lastHeartbeatAt: Date | null): boolean {
    if (!lastHeartbeatAt) return false;

    return Date.now() - lastHeartbeatAt.getTime() < ONLINE_WINDOW_MS;
  }

  private formatHeartbeat(lastHeartbeatAt: Date | null): string {
    if (!lastHeartbeatAt) return '아직 신호를 받지 못했습니다';

    const seconds = Math.floor((Date.now() - lastHeartbeatAt.getTime()) / 1000);
    if (seconds < 60) return `${seconds}초 전`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;

    return `${Math.floor(seconds / 3600)}시간 전`;
  }
}
