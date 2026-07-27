export const MINECRAFT_LINKED_EVENT = 'minecraft.linked';

export class MinecraftLinkedEvent {
  constructor(
    readonly discordId: string,
    readonly guildId: string,
    readonly uuid: string,
    readonly username: string,
  ) {}
}
