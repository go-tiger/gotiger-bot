import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  PLAY_SESSION_ENDED_EVENT,
  PLAY_SESSION_STARTED_EVENT,
  PlaySessionEndedEvent,
  PlaySessionStartedEvent,
} from '../../../common/events/play-session.event';
import { PlaySessionService } from '../../session/play-session.service';
import { ChzzkConnectionService } from './chzzk-connection.service';

/**
 * 플레이 세션에 맞춰 후원 수신 소켓을 열고 닫는다.
 *
 * 소켓 수명을 세션에 종속시키는 지점이다. 연동만으로는 열리지 않고,
 * 게임서버에 접속해 있는 동안만 연결을 유지한다.
 */
@Injectable()
export class ChzzkSessionListener implements OnApplicationBootstrap {
  private readonly logger = new Logger(ChzzkSessionListener.name);

  constructor(
    private readonly connectionService: ChzzkConnectionService,
    private readonly playSessionService: PlaySessionService,
  ) {}

  /**
   * 소켓은 메모리상 연결이라 재시작하면 모두 끊긴다.
   * DB 에 열려 있는 세션을 기준으로 다시 연결한다.
   */
  async onApplicationBootstrap(): Promise<void> {
    const sessions = await this.playSessionService.findAllActive();
    if (sessions.length === 0) return;

    this.logger.log(`치지직 소켓 복구 대상 ${sessions.length}건`);

    for (const session of sessions) {
      await this.connectionService.open(session.userId);
    }
  }

  @OnEvent(PLAY_SESSION_STARTED_EVENT)
  async onSessionStarted(event: PlaySessionStartedEvent): Promise<void> {
    await this.connectionService.open(event.userId);
  }

  @OnEvent(PLAY_SESSION_ENDED_EVENT)
  async onSessionEnded(event: PlaySessionEndedEvent): Promise<void> {
    // 연동을 끊었거나 서버가 사라진 경우는 재사용할 일이 없다.
    const immediate =
      event.reason === 'unlinked' || event.reason === 'server-removed';

    await this.connectionService.close(event.userId, immediate);
  }
}
