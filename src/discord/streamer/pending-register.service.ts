import { Injectable } from '@nestjs/common';
import type { ButtonInteraction } from 'discord.js';

/** 인터랙션 토큰 유효시간(15분)보다 짧게 잡는다. */
const TTL_MS = 14 * 60 * 1000;

interface Pending {
  interaction: ButtonInteraction;
  expiresAt: number;
}

/**
 * 로그인 버튼을 누른 인터랙션을 보관한다.
 * OAuth 콜백이 끝나면 이 메시지를 결과로 교체한다.
 */
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
