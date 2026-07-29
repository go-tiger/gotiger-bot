import { Module } from '@nestjs/common';
import { MinecraftService } from './minecraft.service';

@Module({
  providers: [MinecraftService],
  exports: [MinecraftService],
})
export class MinecraftModule {}
