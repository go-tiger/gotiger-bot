import { Module } from '@nestjs/common';
import { SoopService } from './soop.service';

@Module({
  providers: [SoopService],
  exports: [SoopService],
})
export class SoopModule {}
