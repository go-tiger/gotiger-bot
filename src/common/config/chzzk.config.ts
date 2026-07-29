/** 치지직 오픈 API 엔드포인트. */
export const CHZZK_URLS = {
  /** 인가 코드 발급 화면. */
  authorize: 'https://chzzk.naver.com/account-interlock',
  /** 토큰 발급 · 갱신. */
  token: 'https://chzzk.naver.com/auth/v1/token',
  /** 토큰 폐기. */
  revoke: 'https://chzzk.naver.com/auth/v1/token/revoke',
  openApi: 'https://openapi.chzzk.naver.com',
} as const;

export const CHZZK_GRANT_TYPES = {
  authorizationCode: 'authorization_code',
  refreshToken: 'refresh_token',
} as const;
