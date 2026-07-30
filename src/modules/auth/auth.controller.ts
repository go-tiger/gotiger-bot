import { Controller, Get, Param, Query, Redirect } from '@nestjs/common';
import { AuthStrategyRegistry } from '../../common/registries/auth-strategy.registry';
import { AuthLoginDto } from '../../common/dto/auth-login.dto';

/**
 * 서비스별 OAuth 진입·콜백을 한 곳에서 받는다.
 * 실제 인증 구현은 각 platform/game 모듈이 전략으로 등록한다.
 */
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
    const strategy = this.registry.getOrThrow(service);

    return { url: await strategy.createAuthUrl(query.d, query.g) };
  }

  /**
   * 제공자마다 돌려주는 파라미터가 달라 쿼리를 통째로 넘긴다.
   * (치지직은 code/state, 스팀은 openid.*)
   * 전역 ValidationPipe 의 whitelist 가 값을 걷어내지 않도록 DTO 를 쓰지 않는다.
   */
  @Get(':service/callback')
  async callback(
    @Param('service') service: string,
    @Query() query: Record<string, string>,
  ): Promise<string> {
    const strategy = this.registry.getOrThrow(service);

    return strategy.handleCallback(query);
  }
}
