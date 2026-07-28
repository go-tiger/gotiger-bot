import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../common/entities/user.entity';
import { Minecraft } from '../../common/entities/minecraft.entity';
import { Chzzk } from '../../common/entities/chzzk.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { MinecraftAuthService } from './services/minecraft-auth.service';
import { ChzzkApiService } from './services/chzzk-api.service';
import { ChzzkAuthService } from './services/chzzk-auth.service';
import { msalProvider } from './providers/msal.provider';
import {
  AUTH_PROVIDERS,
  type AuthProvider,
} from './providers/auth-provider.interface';
import { AuthProviderRegistry } from './providers/auth-provider.registry';
import { MinecraftAuthProvider } from './providers/minecraft-auth.provider';
import { ChzzkAuthProvider } from './providers/chzzk-auth.provider';

/** 새 OAuth 연동은 AuthProvider 구현체를 만들어 여기에만 추가하면 된다. */
const authProviders = [MinecraftAuthProvider, ChzzkAuthProvider];

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([User, Minecraft, Chzzk])],
  controllers: [AuthController],
  providers: [
    AuthService,
    MinecraftAuthService,
    ChzzkApiService,
    ChzzkAuthService,
    msalProvider,
    ...authProviders,
    {
      provide: AUTH_PROVIDERS,
      useFactory: (...providers: AuthProvider[]) => providers,
      inject: authProviders,
    },
    AuthProviderRegistry,
  ],
  exports: [AuthService, ChzzkAuthService],
})
export class AuthModule {}
