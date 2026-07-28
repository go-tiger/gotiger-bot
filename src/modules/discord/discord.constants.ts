import type {
  ServiceCategory,
  ServiceId,
} from './providers/link-provider.interface';

export type ChannelKind = 'register' | 'log';

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
