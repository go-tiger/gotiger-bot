export const CHZZK_DONATION_EVENT = 'chzzk.donation';

/**
 * 치지직 후원 이벤트. 소켓으로 받은 페이로드를 도메인 형태로 옮긴 것.
 * 어느 길드에 게시할지는 라우팅 단계에서 세션을 통해 결정한다.
 */
export class ChzzkDonationEvent {
  constructor(
    /** 후원을 받은 채널. 어느 연결에서 온 이벤트인지 식별한다. */
    readonly channelId: string,
    readonly channelName: string,
    /** 채널 소유자. 세션 조회의 키가 된다. */
    readonly userId: number,
    readonly streamerDiscordId: string | null,
    readonly donatorNickname: string,
    /** 원 단위 후원 금액. */
    readonly payAmount: number,
    readonly donationText: string,
    /** 'CHAT' | 'VIDEO'. 치지직 원본값을 가공하지 않고 넘긴다. */
    readonly donationType: string,
    /** 치지직이 이벤트를 보낸 시각. 없으면 수신 시각을 쓴다. */
    readonly sentAt: Date,
  ) {}
}
