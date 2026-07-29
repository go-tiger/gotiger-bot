import { Module } from '@nestjs/common';
import { ChzzkModule } from '../platforms/chzzk/chzzk.module';
import { SteamModule } from '../games/steam/steam.module';
import { AuthController } from './auth.controller';
import {
  AUTH_STRATEGIES,
  type AuthStrategy,
} from '../../common/interfaces/auth-strategy.interface';
import { AuthStrategyRegistry } from '../../common/registries/auth-strategy.registry';
import { ChzzkAuthStrategy } from './strategies/chzzk-auth.strategy';
import { SteamAuthStrategy } from './strategies/steam-auth.strategy';

/**
 * 새 OAuth 연동은 AuthStrategy 구현체를 만들어 여기에만 추가하면 된다.
 * 전략은 얇은 위임이고 실제 로직은 각 서비스 모듈이 갖는다.
 */
const authStrategies = [ChzzkAuthStrategy, SteamAuthStrategy];

@Module({
  imports: [ChzzkModule, SteamModule],
  controllers: [AuthController],
  providers: [
    ...authStrategies,
    {
      provide: AUTH_STRATEGIES,
      useFactory: (...strategies: AuthStrategy[]) => strategies,
      inject: authStrategies,
    },
    AuthStrategyRegistry,
  ],
})
export class AuthModule {}
