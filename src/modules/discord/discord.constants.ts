/** 연동 대상의 큰 분류. 게임은 계정 인증, 플랫폼은 방송 알림을 담당한다. */
export type ServiceCategory = 'game' | 'platform';

export type ServiceId = 'minecraft' | 'palworld' | 'chzzk';

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

/**
 * 컴포넌트 customId 는 `<접두사>/<serviceId>[/<추가>]` 형태로 서비스 키를 담는다.
 * necord 가 path-to-regexp 로 매칭하므로 구분자는 반드시 `/` 여야 하고,
 * 핸들러는 `:service` 파라미터를 @ComponentParam 으로 꺼낸다.
 */
export const SETUP_CATEGORY_BUTTON_ID = 'setup/cat/:category';
export const SETUP_HOME_BUTTON_ID = 'setup/home';
export const SETUP_TOGGLE_BUTTON_ID = 'setup/toggle/:service';
export const SETUP_DISABLE_CONFIRM_BUTTON_ID = 'setup/disable/:service';
export const SETUP_DISABLE_CANCEL_BUTTON_ID = 'setup/keep/:service';
export const SETUP_SERVICE_BUTTON_ID = 'setup/svc/:service';
export const SETUP_AUTO_BUTTON_ID = 'setup/auto/:service';
export const SETUP_MANUAL_BUTTON_ID = 'setup/manual/:service';
export const SETUP_SELECT_ID = 'setup/sel/:service/:kind';
export const REGISTER_BUTTON_ID = 'register/:service';

export const buildCategoryButtonId = (category: ServiceCategory): string =>
  `setup/cat/${category}`;

export const buildToggleButtonId = (service: ServiceId): string =>
  `setup/toggle/${service}`;

export const buildDisableConfirmButtonId = (service: ServiceId): string =>
  `setup/disable/${service}`;

export const buildDisableCancelButtonId = (service: ServiceId): string =>
  `setup/keep/${service}`;

export const buildServiceButtonId = (service: ServiceId): string =>
  `setup/svc/${service}`;

export const buildAutoButtonId = (service: ServiceId): string =>
  `setup/auto/${service}`;

export const buildManualButtonId = (service: ServiceId): string =>
  `setup/manual/${service}`;

export const buildSelectId = (service: ServiceId, kind: ChannelKind): string =>
  `setup/sel/${service}/${kind}`;

export const buildRegisterButtonId = (service: ServiceId): string =>
  `register/${service}`;

/**
 * AuthController 의 `@Get(':service/login')` 과 짝을 이룬다.
 * 경로를 바꿀 때 양쪽이 어긋나지 않도록 여기서만 만든다.
 */
export const buildLoginPath = (service: ServiceId): string =>
  `/auth/${service}/login`;
