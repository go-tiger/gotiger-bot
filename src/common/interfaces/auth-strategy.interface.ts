import type { AuthServiceId } from '../constants/services';

/**
 * OAuth 계정 연결 흐름 하나를 기술한다.
 * AuthController 는 이 인터페이스만 알고 서비스별 분기를 하지 않는다.
 */
export interface AuthStrategy {
  readonly id: AuthServiceId;
  /** 인가 화면 URL. 동기/비동기 구현 모두 허용한다. */
  createAuthUrl(discordId: string, guildId: string): string | Promise<string>;
  /**
   * 콜백 처리 후 사용자에게 보여줄 완료 문구를 만든다.
   *
   * 스팀은 OAuth2 가 아니라 OpenID 2.0 이라 code/state 대신
   * openid.* 파라미터가 온다. 그래서 쿼리 전체를 넘기고
   * 필요한 값을 꺼내 쓰는 것은 각 전략에 맡긴다.
   */
  handleCallback(query: Record<string, string>): Promise<string>;
}

export const AUTH_STRATEGIES = Symbol('AUTH_STRATEGIES');
