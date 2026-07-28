import type { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from 'discord.js';
import type {
  ServiceCategory,
  ServiceId,
} from '../../../common/constants/services';

export interface ServicePanel {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
}

/**
 * 하나의 연동 서비스(마인크래프트, 팰월드 ...)를 기술한다.
 * 새 서비스를 추가할 때는 이 인터페이스 구현체를 만들어
 * DiscordModule 의 linkProviders 배열에 추가하기만 하면 된다.
 */
export interface LinkProvider {
  readonly id: ServiceId;
  readonly category: ServiceCategory;
  /** 사용자에게 보여줄 이름. 버튼 라벨과 임베드에 쓰인다. */
  readonly label: string;
  /** 자동 생성 시 사용할 채널 이름. 카테고리는 분류별로 공유한다. */
  readonly channelNames: { register: string; log: string };
  /** 계정 연결을 지원하는지. false 면 "준비 중" 안내만 보여준다. */
  readonly linkable: boolean;
  /** 로그인 버튼에 표시할 문구. */
  readonly loginLabel?: string;
  /** 등록 채널에 게시할 계정 연결 패널. */
  buildPanel(): ServicePanel;
}

export const LINK_PROVIDERS = Symbol('LINK_PROVIDERS');
