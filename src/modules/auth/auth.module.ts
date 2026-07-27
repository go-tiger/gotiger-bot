import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../common/entities/user.entity';
import { Minecraft } from '../../common/entities/minecraft.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { MinecraftAuthService } from './services/minecraft-auth.service';
import { msalProvider } from './providers/msal.provider';

@Module({
  imports: [TypeOrmModule.forFeature([User, Minecraft])],
  controllers: [AuthController],
  providers: [AuthService, MinecraftAuthService, msalProvider],
  exports: [AuthService],
})
export class AuthModule {}
