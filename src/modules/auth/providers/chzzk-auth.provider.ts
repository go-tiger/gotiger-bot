import { Injectable } from '@nestjs/common';
import { ChzzkAuthService } from '../services/chzzk-auth.service';
import type { AuthProvider } from './auth-provider.interface';

@Injectable()
export class ChzzkAuthProvider implements AuthProvider {
  readonly id = 'chzzk' as const;

  constructor(private readonly chzzkAuthService: ChzzkAuthService) {}

  createAuthUrl(discordId: string, guildId: string): string {
    return this.chzzkAuthService.createAuthUrl(discordId, guildId);
  }

  async handleCallback(code: string, state: string): Promise<string> {
    const chzzk = await this.chzzkAuthService.handleCallback(code, state);

    return `${chzzk.channelName} 채널 연결이 완료되었습니다. 이 창을 닫아주세요.`;
  }
}
