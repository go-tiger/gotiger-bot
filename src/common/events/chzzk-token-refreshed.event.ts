export const CHZZK_TOKEN_REFRESHED_EVENT = 'chzzk.token.refreshed';

/** 액세스 토큰이 갱신되었음을 알린다. 세션 재연결에 쓰인다. */
export class ChzzkTokenRefreshedEvent {
  constructor(readonly channelId: string) {}
}
