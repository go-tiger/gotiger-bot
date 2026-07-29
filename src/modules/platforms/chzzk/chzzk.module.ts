import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../common/entities/user.entity';
import { PlatformChzzk } from '../../../common/entities/platform-chzzk.entity';
import { ChzzkApiService } from './chzzk-api.service';
import { ChzzkAuthService } from './chzzk-auth.service';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([User, PlatformChzzk])],
  providers: [ChzzkApiService, ChzzkAuthService],
  exports: [ChzzkApiService, ChzzkAuthService],
})
export class ChzzkModule {}
