import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Redirect,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Discord 버튼에서 진입하는 경로. Microsoft 로그인 화면으로 넘긴다. */
  @Get('login')
  @Redirect()
  async login(
    @Query('d') discordId?: string,
    @Query('g') guildId?: string,
  ): Promise<{ url: string }> {
    if (!discordId || !guildId) {
      throw new BadRequestException('잘못된 인증 요청입니다.');
    }

    return { url: await this.authService.createAuthUrl(discordId, guildId) };
  }

  @Get('callback')
  async callback(
    @Query('code') code?: string,
    @Query('state') state?: string,
  ): Promise<string> {
    if (!code || !state) {
      throw new BadRequestException('잘못된 인증 요청입니다.');
    }

    const minecraft = await this.authService.handleCallback(code, state);

    return `${minecraft.username} 계정 연결이 완료되었습니다. 이 창을 닫아주세요.`;
  }
}
