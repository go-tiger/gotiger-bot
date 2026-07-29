import { Module } from '@nestjs/common';
import { ChzzkModule } from './chzzk/chzzk.module';
import { SoopModule } from './soop/soop.module';
import { CimeModule } from './cime/cime.module';

/** 방송 플랫폼 연동을 묶는다. 실제 구현은 각 하위 모듈에 있다. */
@Module({
  imports: [ChzzkModule, SoopModule, CimeModule],
  exports: [ChzzkModule, SoopModule, CimeModule],
})
export class PlatformsModule {}
