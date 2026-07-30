export const DONATION_ROUTED_EVENT = 'donation.routed';

export type DonationRouteOutcome =
  'delivered' | 'player-absent' | 'failed' | 'no-session' | 'no-adapter';

/**
 * 후원 라우팅 결과. 로그 채널 게시에 쓴다.
 *
 * guildId 를 라우팅 시점에 확보해 실어 보낸다. 게시 시점에 다시 조회하면
 * 그 사이 세션이 닫혀 어느 길드인지 알 수 없게 된다.
 */
export class DonationRoutedEvent {
  constructor(
    readonly outcome: DonationRouteOutcome,
    readonly guildId: string | null,
    readonly channelName: string,
    readonly streamerDiscordId: string | null,
    readonly donatorNickname: string,
    readonly payAmount: number,
    readonly donationText: string,
    readonly donationType: string,
    readonly sentAt: Date,
    readonly serverName: string | null,
    readonly failureReason: string | null,
  ) {}
}
