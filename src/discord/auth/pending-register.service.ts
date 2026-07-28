import { Injectable } from '@nestjs/common';
import type { ButtonInteraction } from 'discord.js';

/** 인터랙션 토큰 유효시간(15분)보다 짧게 잡는다. */
const TTL_MS = 14 * 60 * 1000;

interface Pending {
  interaction: ButtonInteraction;
  expiresAt: number;
}

@Injectable()
export class PendingRegisterService {
  private readonly pending = new Map<string, Pending>();

  set(discordId: string, interaction: ButtonInteraction): void {
    this.prune();
    this.pending.set(discordId, {
      interaction,
      expiresAt: Date.now() + TTL_MS,
    });
  }

  take(discordId: string): ButtonInteraction | null {
    const found = this.pending.get(discordId);
    if (!found) return null;

    this.pending.delete(discordId);

    return found.expiresAt < Date.now() ? null : found.interaction;
  }

  private prune(): void {
    const now = Date.now();
    for (const [discordId, entry] of this.pending) {
      if (entry.expiresAt < now) {
        this.pending.delete(discordId);
      }
    }
  }
}
