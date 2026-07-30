import { Injectable } from '@nestjs/common';
import { SteamAuthService } from '../../games/steam/steam-auth.service';
import type { AuthStrategy } from '../../../common/interfaces/auth-strategy.interface';

@Injectable()
export class SteamAuthStrategy implements AuthStrategy {
  readonly id = 'steam' as const;

  constructor(private readonly steamAuthService: SteamAuthService) {}

  createAuthUrl(discordId: string, guildId: string): string {
    return this.steamAuthService.createAuthUrl(discordId, guildId);
  }

  async handleCallback(query: Record<string, string>): Promise<string> {
    const { steam, ownsPalworld } =
      await this.steamAuthService.handleCallback(query);

    const notice = ownsPalworld
      ? ''
      : '\n(팰월드 소유를 확인하지 못했습니다. 프로필의 게임 상세 정보가 비공개인지 확인해주세요.)';

    return `${steam.personaName} 계정 연결이 완료되었습니다. 이 창을 닫아주세요.${notice}`;
  }
}
