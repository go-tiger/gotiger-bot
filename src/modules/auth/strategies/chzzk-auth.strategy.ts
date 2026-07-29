import { BadRequestException, Injectable } from '@nestjs/common';
import { ChzzkAuthService } from '../../platforms/chzzk/chzzk-auth.service';
import type { AuthStrategy } from '../../../common/interfaces/auth-strategy.interface';

@Injectable()
export class ChzzkAuthStrategy implements AuthStrategy {
  readonly id = 'chzzk' as const;

  constructor(private readonly chzzkAuthService: ChzzkAuthService) {}

  createAuthUrl(discordId: string, guildId: string): string {
    return this.chzzkAuthService.createAuthUrl(discordId, guildId);
  }

  async handleCallback(query: Record<string, string>): Promise<string> {
    const { code, state } = query;
    if (!code || !state) {
      throw new BadRequestException('잘못된 인증 요청입니다.');
    }

    const chzzk = await this.chzzkAuthService.handleCallback(code, state);

    return `${chzzk.channelName} 채널 연결이 완료되었습니다. 이 창을 닫아주세요.`;
  }
}
