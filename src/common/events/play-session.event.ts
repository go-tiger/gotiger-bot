export const PLAY_SESSION_STARTED_EVENT = 'play-session.started';
export const PLAY_SESSION_ENDED_EVENT = 'play-session.ended';

/**
 * 스트리머가 게임서버에 접속해 세션이 열렸다.
 * 이 시점에 후원 수신 소켓을 연결한다.
 */
export class PlaySessionStartedEvent {
  constructor(
    readonly sessionId: number,
    readonly userId: number,
    readonly gameServerId: number,
    readonly guildId: string,
  ) {}
}

/**
 * 세션이 닫혔다. 소켓은 곧바로 끊지 않고 유예를 둔다.
 * 재입장이 잦아 매번 세션을 새로 발급하면 치지직 호출이 낭비된다.
 */
export class PlaySessionEndedEvent {
  constructor(
    readonly sessionId: number,
    readonly userId: number,
    readonly gameServerId: number,
    readonly reason: 'leave' | 'expired' | 'unlinked' | 'server-removed',
  ) {}
}
