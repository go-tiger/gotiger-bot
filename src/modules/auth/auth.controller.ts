import { Controller, Get, Param, Query, Redirect } from '@nestjs/common';
import { AuthStrategyRegistry } from '../../common/registries/auth-strategy.registry';
import { AuthCallbackDto } from '../../common/dto/auth-callback.dto';
import { AuthLoginDto } from '../../common/dto/auth-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly registry: AuthStrategyRegistry) {}

  /** Discord 버튼에서 진입하는 경로. 서비스별 로그인 화면으로 넘긴다. */
  @Get(':service/login')
  @Redirect()
  async login(
    @Param('service') service: string,
    @Query() query: AuthLoginDto,
  ): Promise<{ url: string }> {
    const provider = this.registry.getOrThrow(service);

    return { url: await provider.createAuthUrl(query.d, query.g) };
  }

  @Get(':service/callback')
  async callback(
    @Param('service') service: string,
    @Query() query: AuthCallbackDto,
  ): Promise<string> {
    const provider = this.registry.getOrThrow(service);

    return provider.handleCallback(query.code, query.state);
  }
}
