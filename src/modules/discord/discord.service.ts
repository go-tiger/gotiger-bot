import { Injectable, Logger } from '@nestjs/common';
import { Context, On } from 'necord';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  @On('error')
  onError(@Context() [error]: [Error]) {
    this.logger.error(error.message, error.stack);
  }
}
