import { Module } from '@nestjs/common';
import { PalworldService } from './palworld.service';

@Module({
  providers: [PalworldService],
  exports: [PalworldService],
})
export class PalworldModule {}
