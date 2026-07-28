import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import type { AuthStrategy } from '../../../common/interfaces/auth-strategy.interface';

@Injectable()
export class MinecraftAuthStrategy implements AuthStrategy {
  readonly id = 'minecraft' as const;

  constructor(private readonly authService: AuthService) {}

  createAuthUrl(discordId: string, guildId: string): Promise<string> {
    return this.authService.createAuthUrl(discordId, guildId);
  }

  async handleCallback(code: string, state: string): Promise<string> {
    const minecraft = await this.authService.handleCallback(code, state);

    return `${minecraft.username} 계정 연결이 완료되었습니다. 이 창을 닫아주세요.`;
  }
}
