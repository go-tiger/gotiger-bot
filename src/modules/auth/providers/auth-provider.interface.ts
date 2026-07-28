import type { ServiceId } from '../../discord/discord.constants';

/**
 * OAuth 계정 연결 흐름 하나를 기술한다.
 * AuthController 는 이 인터페이스만 알고 서비스별 분기를 하지 않는다.
 */
export interface AuthProvider {
  readonly id: ServiceId;
  /** 인가 화면 URL. 동기/비동기 구현 모두 허용한다. */
  createAuthUrl(discordId: string, guildId: string): string | Promise<string>;
  /** 콜백 처리 후 사용자에게 보여줄 완료 문구를 만든다. */
  handleCallback(code: string, state: string): Promise<string>;
}

export const AUTH_PROVIDERS = Symbol('AUTH_PROVIDERS');
