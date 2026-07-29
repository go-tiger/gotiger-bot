import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../common/entities/user.entity';
import { Minecraft } from '../../common/entities/minecraft.entity';
import { Chzzk } from '../../common/entities/chzzk.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MinecraftAuthService } from './services/minecraft-auth.service';
import { ChzzkApiService } from './services/chzzk-api.service';
import { ChzzkAuthService } from './services/chzzk-auth.service';
import { ChzzkSessionService } from './services/chzzk-session.service';
import { msalProvider } from '../../common/config/msal.config';
import {
  AUTH_STRATEGIES,
  type AuthStrategy,
} from '../../common/interfaces/auth-strategy.interface';
import { AuthStrategyRegistry } from '../../common/registries/auth-strategy.registry';
import { MinecraftAuthStrategy } from './strategies/minecraft-auth.strategy';
import { ChzzkAuthStrategy } from './strategies/chzzk-auth.strategy';

/** 새 OAuth 연동은 AuthStrategy 구현체를 만들어 여기에만 추가하면 된다. */
const authStrategies = [MinecraftAuthStrategy, ChzzkAuthStrategy];

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([User, Minecraft, Chzzk])],
  controllers: [AuthController],
  providers: [
    AuthService,
    MinecraftAuthService,
    ChzzkApiService,
    ChzzkAuthService,
    ChzzkSessionService,
    msalProvider,
    ...authStrategies,
    {
      provide: AUTH_STRATEGIES,
      useFactory: (...strategies: AuthStrategy[]) => strategies,
      inject: authStrategies,
    },
    AuthStrategyRegistry,
  ],
  exports: [AuthService, ChzzkAuthService],
})
export class AuthModule {}
