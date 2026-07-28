export const CHZZK_LINKED_EVENT = 'chzzk.linked';

export class ChzzkLinkedEvent {
  constructor(
    readonly discordId: string,
    readonly guildId: string,
    readonly channelId: string,
    readonly channelName: string,
  ) {}
}
