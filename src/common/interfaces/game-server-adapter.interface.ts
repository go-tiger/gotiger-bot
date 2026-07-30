import type { GameId } from '../constants/services';

/** 게임서버에 전달할 후원 정보. 판단은 게임서버가 한다. */
export interface DonationPayload {
  /** 게임 내 플레이어 식별자. 팰월드는 SteamID64. */
  playerId: string;
  streamerName: string;
  platform: string;
  /** 플랫폼 원본값. 봇은 가공하지 않는다. */
  donationType: string;
  amount: number;
  message: string;
  donorName: string;
  donatedAt: Date;
}

export type DonationDeliveryResult =
  /** 게임서버가 받았다. */
  | { status: 'delivered' }
  /** 플레이어가 접속해 있지 않다. 세션이 어긋났으므로 닫아야 한다. */
  | { status: 'player-absent' }
  /** 그 외 실패. 세션은 유지하고 heartbeat 가 정리하게 둔다. */
  | { status: 'failed'; reason: string };

/**
 * 게임서버 한 종류와 통신하는 방법을 기술한다.
 * 새 게임을 붙일 때는 이 인터페이스 구현체를 만들어 레지스트리에 등록한다.
 */
export interface GameServerAdapter {
  readonly game: GameId;

  /** 게임 내 식별자를 찾는다. 연동이 없으면 null. */
  resolvePlayerId(userId: number): Promise<string | null>;

  deliverDonation(
    gameServerId: number,
    payload: DonationPayload,
  ): Promise<DonationDeliveryResult>;
}

export const GAME_SERVER_ADAPTERS = Symbol('GAME_SERVER_ADAPTERS');
