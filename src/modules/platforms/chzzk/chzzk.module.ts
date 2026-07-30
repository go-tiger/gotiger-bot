import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../common/entities/user.entity';
import { PlatformChzzk } from '../../../common/entities/platform-chzzk.entity';
import { SessionModule } from '../../session/session.module';
import { ChzzkApiService } from './chzzk-api.service';
import { ChzzkAuthService } from './chzzk-auth.service';
import { ChzzkConnectionService } from './chzzk-connection.service';
import { ChzzkSessionListener } from './chzzk-session.listener';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([User, PlatformChzzk]),
    SessionModule,
  ],
  providers: [
    ChzzkApiService,
    ChzzkAuthService,
    ChzzkConnectionService,
    ChzzkSessionListener,
  ],
  exports: [ChzzkApiService, ChzzkAuthService, ChzzkConnectionService],
})
export class ChzzkModule {}
