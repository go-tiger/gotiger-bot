import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Button,
  ComponentParam,
  Context,
  Modal,
  ModalParam,
  SelectedStrings,
  StringSelect,
} from 'necord';
import type { ButtonContext, ModalContext, StringSelectContext } from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { GuildService } from '../../modules/guild/guild.service';
import {
  PalworldServerService,
  type IssuedKeys,
} from '../../modules/games/palworld/palworld-server.service';
import { PlaySessionService } from '../../modules/session/play-session.service';
import { GameServerPanelService } from './game-server-panel.service';
import {
  GAME_SERVER_ADD_BUTTON_ID,
  GAME_SERVER_ADD_MODAL_ID,
  GAME_SERVER_BASE_URL_INPUT_ID,
  GAME_SERVER_EDIT_BUTTON_ID,
  GAME_SERVER_EDIT_MODAL_ID,
  GAME_SERVER_HOME_BUTTON_ID,
  GAME_SERVER_NAME_INPUT_ID,
  GAME_SERVER_REISSUE_BUTTON_ID,
  GAME_SERVER_REMOVE_BUTTON_ID,
  GAME_SERVER_REMOVE_CONFIRM_BUTTON_ID,
  GAME_SERVER_SELECT_ID,
  buildGameServerAddModalId,
  buildGameServerEditModalId,
  buildGameServerRemoveConfirmId,
} from '../shared/discord.constants';

/**
 * 게임서버 등록·수정·삭제·키 재발급.
 *
 * 발급된 키는 ephemeral 로 한 번만 보여준다. 다시 조회할 수 없고
 * 분실하면 재발급해야 한다. 채널에 남기면 누구나 볼 수 있다.
 */
@Injectable()
export class GameServerButton {
  private readonly logger = new Logger(GameServerButton.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly guildService: GuildService,
    private readonly palworldServerService: PalworldServerService,
    private readonly playSessionService: PlaySessionService,
    private readonly panel: GameServerPanelService,
  ) {}

  @Button(GAME_SERVER_HOME_BUTTON_ID)
  async onHome(@Context() [interaction]: ButtonContext) {
    if (!interaction.guildId) return this.replyGuildOnly(interaction);

    await interaction.deferUpdate();

    const { embeds, components } = await this.panel.buildList(
      interaction.guildId,
    );

    return interaction.editReply({ embeds, components });
  }

  @Button(GAME_SERVER_ADD_BUTTON_ID)
  async onAdd(@Context() [interaction]: ButtonContext) {
    if (!interaction.guildId) return this.replyGuildOnly(interaction);

    const modal = new ModalBuilder()
      .setCustomId(buildGameServerAddModalId('palworld'))
      .setTitle('팰월드 서버 등록')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(GAME_SERVER_NAME_INPUT_ID)
            .setLabel('서버 이름')
            .setPlaceholder('메인 서버')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(80),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(GAME_SERVER_BASE_URL_INPUT_ID)
            .setLabel('모드 HTTP 주소')
            .setPlaceholder('http://1.2.3.4:25576')
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );

    return interaction.showModal(modal);
  }

  @Modal(GAME_SERVER_ADD_MODAL_ID)
  async onAddSubmit(@Context() [interaction]: ModalContext) {
    if (!interaction.guildId) return this.replyGuildOnly(interaction);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const name = interaction.fields.getTextInputValue(
      GAME_SERVER_NAME_INPUT_ID,
    );
    const baseUrl = interaction.fields.getTextInputValue(
      GAME_SERVER_BASE_URL_INPUT_ID,
    );

    if (!this.isValidBaseUrl(baseUrl)) {
      return interaction.editReply({
        content:
          '주소 형식이 올바르지 않습니다. `http://호스트:포트` 형태로 입력해주세요.',
      });
    }

    // game_servers 가 guilds 를 참조하므로 행이 있어야 한다.
    await this.guildService.ensure(interaction.guildId);

    const keys = await this.palworldServerService.register(
      interaction.guildId,
      name,
      baseUrl,
    );

    return interaction.editReply({
      embeds: [this.buildKeyEmbed(name, keys)],
    });
  }

  @StringSelect(GAME_SERVER_SELECT_ID)
  async onSelect(
    @Context() [interaction]: StringSelectContext,
    @SelectedStrings() selected: string[],
  ) {
    const gameServerId = Number(selected[0]);
    if (!Number.isInteger(gameServerId)) return;

    await interaction.deferUpdate();

    const view = await this.panel.buildDetail(gameServerId);
    if (!view) {
      return interaction.editReply({
        content: '게임서버를 찾을 수 없습니다.',
        embeds: [],
        components: [],
      });
    }

    return interaction.editReply(view);
  }

  @Button(GAME_SERVER_EDIT_BUTTON_ID)
  async onEdit(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('serverId') serverId: string,
  ) {
    const gameServerId = Number(serverId);
    const palworld = await this.palworldServerService.findOne(gameServerId);
    if (!palworld?.gameServer) {
      return interaction.reply({
        content: '게임서버를 찾을 수 없습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(buildGameServerEditModalId('palworld', gameServerId))
      .setTitle('팰월드 서버 수정')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(GAME_SERVER_NAME_INPUT_ID)
            .setLabel('서버 이름')
            .setValue(palworld.gameServer.name)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(80),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId(GAME_SERVER_BASE_URL_INPUT_ID)
            .setLabel('모드 HTTP 주소')
            .setValue(palworld.baseUrl)
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );

    return interaction.showModal(modal);
  }

  @Modal(GAME_SERVER_EDIT_MODAL_ID)
  async onEditSubmit(
    @Context() [interaction]: ModalContext,
    @ModalParam('serverId') serverId: string,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const name = interaction.fields.getTextInputValue(
      GAME_SERVER_NAME_INPUT_ID,
    );
    const baseUrl = interaction.fields.getTextInputValue(
      GAME_SERVER_BASE_URL_INPUT_ID,
    );

    if (!this.isValidBaseUrl(baseUrl)) {
      return interaction.editReply({
        content:
          '주소 형식이 올바르지 않습니다. `http://호스트:포트` 형태로 입력해주세요.',
      });
    }

    await this.palworldServerService.update(Number(serverId), {
      name,
      baseUrl,
    });

    return interaction.editReply({
      content: `**${name}** 정보를 수정했습니다.`,
    });
  }

  @Button(GAME_SERVER_REISSUE_BUTTON_ID)
  async onReissue(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('serverId') serverId: string,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const gameServerId = Number(serverId);
    const palworld = await this.palworldServerService.findOne(gameServerId);
    if (!palworld?.gameServer) {
      return interaction.editReply({
        content: '게임서버를 찾을 수 없습니다.',
      });
    }

    const keys = await this.palworldServerService.reissueKeys(gameServerId);

    const embed = this.buildKeyEmbed(palworld.gameServer.name, keys).setFooter({
      text: '이전 키는 즉시 무효화되었습니다. 모드 설정을 반드시 갱신해주세요.',
    });

    return interaction.editReply({ embeds: [embed] });
  }

  @Button(GAME_SERVER_REMOVE_BUTTON_ID)
  async onRemove(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('serverId') serverId: string,
  ) {
    const gameServerId = Number(serverId);
    const palworld = await this.palworldServerService.findOne(gameServerId);
    if (!palworld?.gameServer) {
      return interaction.reply({
        content: '게임서버를 찾을 수 없습니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      content:
        `**${palworld.gameServer.name}** 을 삭제할까요?\n` +
        '접속 중인 세션이 종료되고 발급된 키가 무효화됩니다.',
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(
              buildGameServerRemoveConfirmId('palworld', gameServerId),
            )
            .setLabel('삭제')
            .setStyle(ButtonStyle.Danger),
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  @Button(GAME_SERVER_REMOVE_CONFIRM_BUTTON_ID)
  async onRemoveConfirm(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('serverId') serverId: string,
  ) {
    await interaction.deferUpdate();

    const gameServerId = Number(serverId);

    // 세션을 먼저 닫아야 소켓 정리 이벤트가 발행된다.
    await this.playSessionService.endByServer(gameServerId, 'server-removed');
    await this.palworldServerService.remove(gameServerId);

    return interaction.editReply({
      content: '게임서버를 삭제했습니다.',
      components: [],
    });
  }

  /**
   * 서버장이 모드 .env 에 그대로 붙여넣을 수 있는 형태로 안내한다.
   * BOT_URL 은 /game/palworld 까지 포함해야 모드의 경로 조립과 맞는다.
   */
  private buildKeyEmbed(name: string, keys: IssuedKeys): EmbedBuilder {
    const baseUrl = this.configService.get<string>('BASE_URL') ?? '';

    return new EmbedBuilder()
      .setTitle(`🔑 ${name} 연결 정보`)
      .setDescription(
        '아래 값을 게임서버의 `.env` 에 넣고 모드를 재시작해주세요.\n' +
          '**이 정보는 다시 볼 수 없습니다.**',
      )
      .setColor(0xfaa61a)
      .addFields({
        name: '설정값',
        value:
          '```env\n' +
          `GT_BRIDGE_SERVER_ID=${keys.serverId}\n` +
          `GT_BRIDGE_SERVER_KEY=${keys.serverKey}\n` +
          `GT_BRIDGE_API_KEY=${keys.botKey}\n` +
          `GT_BRIDGE_BOT_URL=${baseUrl}/game/palworld\n` +
          '```',
      });
  }

  /** 모드는 평문 HTTP 로 열려 있어 https 를 강제하지 않는다. */
  private isValidBaseUrl(baseUrl: string): boolean {
    try {
      const url = new URL(baseUrl.trim());

      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private replyGuildOnly(interaction: ButtonContext[0] | ModalContext[0]) {
    return interaction.reply({
      content: '서버 안에서만 사용할 수 있습니다.',
      flags: MessageFlags.Ephemeral,
    });
  }
}
