/**
 * 스팀은 OAuth2 가 아니라 OpenID 2.0 이다.
 * 인가 화면으로 보낸 뒤 돌아온 openid.* 파라미터를 같은 엔드포인트로
 * 되돌려 보내 검증(check_authentication)해야 신뢰할 수 있다.
 */
export const STEAM_URLS = {
  openId: 'https://steamcommunity.com/openid/login',
  webApi: 'https://api.steampowered.com',
} as const;

/** OpenID 2.0 규격상 고정값. */
export const STEAM_OPENID = {
  ns: 'http://specs.openid.net/auth/2.0',
  identifierSelect: 'http://specs.openid.net/auth/2.0/identifier_select',
  checkAuthentication: 'check_authentication',
} as const;

/** claimed_id 는 https://steamcommunity.com/openid/id/{steamId64} 형태로 온다. */
export const STEAM_CLAIMED_ID_PATTERN =
  /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

/** 팰월드 스팀 앱 ID. 소유 여부 확인에 쓴다. */
export const PALWORLD_APP_ID = 1623730;
