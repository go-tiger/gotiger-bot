import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * 서비스별 OAuth 진입·콜백을 한 곳에서 받는다.
 * 실제 인증 구현은 각 platform/game 모듈이 전략으로 등록한다.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
