import type { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from 'discord.js';

/** 연동 대상의 큰 분류. 게임은 계정 인증, 플랫폼은 방송 알림을 담당한다. */
export type ServiceCategory = 'game' | 'platform';

export type ServiceId = 'minecraft' | 'palworld';

export interface ServicePanel {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
}

/**
 * 하나의 연동 서비스(마인크래프트, 팰월드 ...)를 기술한다.
 * 새 서비스를 추가할 때는 이 인터페이스 구현체를 만들어
 * DiscordModule 의 LINK_PROVIDERS 에 등록하기만 하면 된다.
 */
export interface LinkProvider {
  readonly id: ServiceId;
  readonly category: ServiceCategory;
  /** 사용자에게 보여줄 이름. 버튼 라벨과 임베드에 쓰인다. */
  readonly label: string;
  /** 자동 생성 시 사용할 채널 이름. 카테고리는 분류별로 공유한다. */
  readonly channelNames: { register: string; log: string };
  /** 등록 채널에 게시할 계정 연결 패널. */
  buildPanel(): ServicePanel;
}

export const LINK_PROVIDERS = Symbol('LINK_PROVIDERS');

/** provider 유무와 무관하게 /설정 에 노출할 분류 순서. */
export const SERVICE_CATEGORIES: ServiceCategory[] = ['game', 'platform'];

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  game: '게임',
  platform: '플랫폼',
};

export const CATEGORY_EMOJIS: Record<ServiceCategory, string> = {
  game: '🎮',
  platform: '📺',
};

/** 자동 생성 시 서비스들이 함께 들어갈 카테고리 채널 이름. */
export const CATEGORY_CHANNEL_NAMES: Record<ServiceCategory, string> = {
  game: '게임',
  platform: '플랫폼',
};
