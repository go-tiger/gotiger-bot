import { Injectable, Logger } from '@nestjs/common';
import { Context, On } from 'necord';

/** Discord 클라이언트 레벨 오류를 로그로 남긴다. */
@Injectable()
export class DiscordErrorListener {
  private readonly logger = new Logger(DiscordErrorListener.name);

  @On('error')
  onError(@Context() [error]: [Error]) {
    this.logger.error(error.message, error.stack);
  }
}
