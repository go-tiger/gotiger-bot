/**
 * discord 계층과 도메인 모듈이 함께 쓰는 연동 서비스 어휘.
 * Discord 표현(버튼 customId, 임베드)은 discord.constants 가 따로 갖는다.
 */

/** 연동 대상의 큰 분류. 게임은 계정 인증, 플랫폼은 방송 후원 수신을 담당한다. */
export type ServiceCategory = 'game' | 'platform';

export type GameId = 'minecraft' | 'palworld';

export type PlatformId = 'chzzk' | 'soop' | 'cime';

export type ServiceId = GameId | PlatformId;

/** 계정 제공자. 게임이나 플랫폼이 아니라 인증 수단이다. */
export type AccountProviderId = 'steam' | 'microsoft';

/** OAuth 진입 경로(/auth/:service)에 쓰이는 식별자. */
export type AuthServiceId = PlatformId | AccountProviderId;

export type ChannelKind = 'register' | 'log';

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
