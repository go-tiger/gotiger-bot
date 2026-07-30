import { Injectable } from '@nestjs/common';
import { Button, ComponentParam, Context } from 'necord';
import type { ButtonContext } from 'necord';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  time,
  TimestampStyles,
} from 'discord.js';
import { LinkStatusService } from '../../modules/link/link-status.service';
import { LinkUnlinkService } from '../../modules/link/link-unlink.service';
import type { AuthServiceId } from '../../common/constants/services';
import {
  LINK_STATUS_BUTTON_ID,
  LINK_UNLINK_BUTTON_ID,
  LINK_UNLINK_CONFIRM_BUTTON_ID,
  buildUnlinkConfirmButtonId,
} from '../shared/discord.constants';

const UNLINKABLE: AuthServiceId[] = ['chzzk', 'steam'];

const SERVICE_LABELS: Record<string, string> = {
  chzzk: '치지직',
  steam: 'Steam',
};

/** 스트리머 본인의 연동 상태를 보여주고 해제까지 처리한다. */
@Injectable()
export class LinkStatusButton {
  constructor(
    private readonly linkStatusService: LinkStatusService,
    private readonly linkUnlinkService: LinkUnlinkService,
  ) {}

  @Button(LINK_STATUS_BUTTON_ID)
  async onStatus(@Context() [interaction]: ButtonContext) {
    // 본인만 볼 수 있어야 하므로 항상 ephemeral 이다.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const status = await this.linkStatusService.find(interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle('내 연동 상태')
      .setColor(0x5865f2)
      .addFields(
        {
          name: '📺 치지직',
          value: status.chzzk
            ? `✅ ${status.chzzk.channelName}`
            : '⚪ 미연동 — 후원을 받으려면 연결이 필요합니다',
        },
        {
          name: '🎮 Steam (팰월드)',
          value: status.steam
            ? `✅ ${status.steam.personaName}` +
              (status.steam.ownsPalworld
                ? ''
                : '\n⚠️ 팰월드 소유를 확인하지 못했습니다')
            : '⚪ 미연동 — 게임 접속을 인식하려면 연결이 필요합니다',
        },
        {
          name: '🕹️ 현재 플레이',
          value: status.session
            ? `**${status.session.serverName}** 접속 중\n` +
              `시작: ${time(status.session.startedAt, TimestampStyles.RelativeTime)}`
            : '접속 중인 게임서버가 없습니다',
        },
      );

    if (!status.chzzk || !status.steam) {
      embed.setFooter({
        text: '치지직과 게임 계정을 모두 연결해야 후원이 게임으로 전달됩니다.',
      });
    }

    const linked = UNLINKABLE.filter((service) =>
      service === 'chzzk' ? status.chzzk : status.steam,
    );

    return interaction.editReply({
      embeds: [embed],
      components: linked.length
        ? [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              linked.map((service) =>
                new ButtonBuilder()
                  .setCustomId(`link/unlink/${service}`)
                  .setLabel(`${SERVICE_LABELS[service]} 연동 해제`)
                  .setStyle(ButtonStyle.Danger),
              ),
            ),
          ]
        : [],
    });
  }

  @Button(LINK_UNLINK_BUTTON_ID)
  async onUnlink(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('service') service: string,
  ) {
    const label = SERVICE_LABELS[service];
    if (!label) {
      return interaction.reply({
        content: '알 수 없는 서비스입니다.',
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      content:
        `**${label}** 연동을 해제할까요?\n` +
        '접속 중인 세션이 종료되고 후원 전달이 중단됩니다.',
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(buildUnlinkConfirmButtonId(service as AuthServiceId))
            .setLabel('해제')
            .setStyle(ButtonStyle.Danger),
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  @Button(LINK_UNLINK_CONFIRM_BUTTON_ID)
  async onUnlinkConfirm(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('service') service: string,
  ) {
    await interaction.deferUpdate();

    const label = SERVICE_LABELS[service] ?? service;
    const removed = await this.linkUnlinkService.unlink(
      interaction.user.id,
      service as AuthServiceId,
    );

    return interaction.editReply({
      content: removed
        ? `**${label}** 연동을 해제했습니다.`
        : `연동된 **${label}** 계정이 없습니다.`,
      components: [],
    });
  }
}
