import type {
  AuthServiceId,
  ChannelKind,
  ServiceCategory,
  ServiceId,
} from '../../common/constants/services';

/**
 * 컴포넌트 customId 는 `<접두사>/<키>[/<추가>]` 형태로 서비스 키를 담는다.
 * necord 가 path-to-regexp 로 매칭하므로 구분자는 반드시 `/` 여야 하고,
 * 핸들러는 `:service` 같은 파라미터를 @ComponentParam 으로 꺼낸다.
 */
export const SETUP_CATEGORY_BUTTON_ID = 'setup/cat/:category';
export const SETUP_HOME_BUTTON_ID = 'setup/home';
export const SETUP_TOGGLE_BUTTON_ID = 'setup/toggle/:service';
export const SETUP_SERVICE_BUTTON_ID = 'setup/svc/:service';
export const SETUP_AUTO_BUTTON_ID = 'setup/auto/:service';
export const SETUP_SELECT_ID = 'setup/sel/:service/:kind';

/** 게임서버 관리 (서버장 전용). */
export const GAME_SERVER_HOME_BUTTON_ID = 'gs/home/:game';
export const GAME_SERVER_ADD_BUTTON_ID = 'gs/add/:game';
export const GAME_SERVER_ADD_MODAL_ID = 'gs/add-modal/:game';
export const GAME_SERVER_SELECT_ID = 'gs/sel/:game';
export const GAME_SERVER_EDIT_BUTTON_ID = 'gs/edit/:game/:serverId';
export const GAME_SERVER_EDIT_MODAL_ID = 'gs/edit-modal/:game/:serverId';
export const GAME_SERVER_REISSUE_BUTTON_ID = 'gs/reissue/:game/:serverId';
export const GAME_SERVER_REMOVE_BUTTON_ID = 'gs/remove/:game/:serverId';
export const GAME_SERVER_REMOVE_CONFIRM_BUTTON_ID =
  'gs/remove-ok/:game/:serverId';

/** 스트리머 연동 패널. */
export const REGISTER_BUTTON_ID = 'register/:service';
export const LINK_STATUS_BUTTON_ID = 'link/status';
export const LINK_UNLINK_BUTTON_ID = 'link/unlink/:service';
export const LINK_UNLINK_CONFIRM_BUTTON_ID = 'link/unlink-ok/:service';

export const buildCategoryButtonId = (category: ServiceCategory): string =>
  `setup/cat/${category}`;

export const buildToggleButtonId = (service: ServiceId): string =>
  `setup/toggle/${service}`;

export const buildServiceButtonId = (service: ServiceId): string =>
  `setup/svc/${service}`;

export const buildAutoButtonId = (service: ServiceId): string =>
  `setup/auto/${service}`;

export const buildSelectId = (service: ServiceId, kind: ChannelKind): string =>
  `setup/sel/${service}/${kind}`;

export const buildGameServerHomeId = (game: string): string =>
  `gs/home/${game}`;

export const buildGameServerAddId = (game: string): string => `gs/add/${game}`;

export const buildGameServerAddModalId = (game: string): string =>
  `gs/add-modal/${game}`;

export const buildGameServerSelectId = (game: string): string =>
  `gs/sel/${game}`;

export const buildGameServerEditId = (game: string, serverId: number): string =>
  `gs/edit/${game}/${serverId}`;

export const buildGameServerEditModalId = (
  game: string,
  serverId: number,
): string => `gs/edit-modal/${game}/${serverId}`;

export const buildGameServerReissueId = (
  game: string,
  serverId: number,
): string => `gs/reissue/${game}/${serverId}`;

export const buildGameServerRemoveId = (
  game: string,
  serverId: number,
): string => `gs/remove/${game}/${serverId}`;

export const buildGameServerRemoveConfirmId = (
  game: string,
  serverId: number,
): string => `gs/remove-ok/${game}/${serverId}`;

export const buildRegisterButtonId = (service: ServiceId): string =>
  `register/${service}`;

export const buildUnlinkButtonId = (service: AuthServiceId): string =>
  `link/unlink/${service}`;

export const buildUnlinkConfirmButtonId = (service: AuthServiceId): string =>
  `link/unlink-ok/${service}`;

/**
 * AuthController 의 `@Get(':service/login')` 과 짝을 이룬다.
 * 경로를 바꿀 때 양쪽이 어긋나지 않도록 여기서만 만든다.
 */
export const buildLoginPath = (service: AuthServiceId): string =>
  `/auth/${service}/login`;

/** 모달 입력 필드 ID. */
export const GAME_SERVER_NAME_INPUT_ID = 'name';
export const GAME_SERVER_BASE_URL_INPUT_ID = 'baseUrl';
