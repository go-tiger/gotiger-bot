export const CHZZK_DONATION_EVENT = 'chzzk.donation';

/** 치지직 후원 이벤트. 소켓으로 받은 페이로드를 도메인 형태로 옮긴 것. */
export class ChzzkDonationEvent {
  constructor(
    /** 후원을 받은 채널. 어느 연결에서 온 이벤트인지 식별한다. */
    readonly channelId: string,
    /** 게시 대상 Discord 서버. 연결 시점에 저장해 둔 값이다. */
    readonly guildId: string,
    readonly channelName: string,
    /** 후원을 받은 스트리머의 Discord ID. 멘션에 쓴다. */
    readonly streamerDiscordId: string | null,
    readonly donatorNickname: string,
    /** 원 단위 후원 금액. */
    readonly payAmount: number,
    readonly donationText: string,
    /** 'CHAT' | 'VIDEO' */
    readonly donationType: string,
    /** 치지직이 이벤트를 보낸 시각. 없으면 수신 시각을 쓴다. */
    readonly sentAt: Date,
  ) {}
}
