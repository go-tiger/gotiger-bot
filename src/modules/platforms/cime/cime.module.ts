import { Module } from '@nestjs/common';
import { CimeService } from './cime.service';

@Module({
  providers: [CimeService],
  exports: [CimeService],
})
export class CimeModule {}
