export const STEAM_LINKED_EVENT = 'steam.linked';

/** Steam 계정이 연결되었음을 알린다. 팰월드 세션 매칭의 전제다. */
export class SteamLinkedEvent {
  constructor(
    readonly discordId: string,
    readonly guildId: string,
    readonly steamId: string,
    readonly personaName: string,
    /** 팰월드 소유 여부. 프로필이 비공개면 확인하지 못해 false 다. */
    readonly ownsPalworld: boolean,
  ) {}
}
