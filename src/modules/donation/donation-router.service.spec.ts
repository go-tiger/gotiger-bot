import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { ChzzkDonationEvent } from '../../common/events/chzzk-donation.event';
import {
  DONATION_ROUTED_EVENT,
  DonationRoutedEvent,
} from '../../common/events/donation-routed.event';
import { GameServerAdapterRegistry } from '../../common/registries/game-server-adapter.registry';
import type { DonationDeliveryResult } from '../../common/interfaces/game-server-adapter.interface';
import { PlaySessionService } from '../session/play-session.service';
import { DonationRouterService } from './donation-router.service';

function donation(): ChzzkDonationEvent {
  return new ChzzkDonationEvent(
    'ch1',
    '고타이거',
    10,
    '123456789012345678',
    '후원자',
    5000,
    '화이팅',
    'CHAT',
    new Date('2026-07-30T12:00:00Z'),
  );
}

describe('DonationRouterService', () => {
  let service: DonationRouterService;
  let emit: jest.Mock<void, [string, DonationRoutedEvent]>;
  let endByUser: jest.Mock;
  let deliverDonation: jest.Mock;

  async function build(options: {
    session?: unknown;
    adapter?: unknown;
    playerId?: string | null;
    result?: DonationDeliveryResult;
  }) {
    emit = jest.fn<void, [string, DonationRoutedEvent]>();
    endByUser = jest.fn();
    deliverDonation = jest.fn(() =>
      Promise.resolve(options.result ?? { status: 'delivered' }),
    );

    const adapter =
      options.adapter === undefined
        ? {
            game: 'palworld',
            resolvePlayerId: jest.fn(() =>
              Promise.resolve(
                options.playerId === undefined
                  ? '76561198083499333'
                  : options.playerId,
              ),
            ),
            deliverDonation,
          }
        : options.adapter;

    const moduleRef = await Test.createTestingModule({
      providers: [
        DonationRouterService,
        { provide: EventEmitter2, useValue: { emit } },
        {
          provide: PlaySessionService,
          useValue: {
            findActiveWithServer: jest.fn(() =>
              Promise.resolve(
                options.session === undefined
                  ? {
                      userId: 10,
                      gameServer: {
                        id: 100,
                        game: 'palworld',
                        guildId: 'g1',
                        name: '메인서버',
                      },
                    }
                  : options.session,
              ),
            ),
            endByUser,
          },
        },
        {
          provide: GameServerAdapterRegistry,
          useValue: { find: jest.fn(() => adapter) },
        },
      ],
    }).compile();

    service = moduleRef.get(DonationRouterService);
  }

  /** DONATION_ROUTED_EVENT 로 발행된 결과를 꺼낸다. */
  function routed(): DonationRoutedEvent {
    const call = emit.mock.calls.find(
      ([name]) => name === DONATION_ROUTED_EVENT,
    );
    if (!call) throw new Error('라우팅 결과 이벤트가 발행되지 않았습니다.');

    return call[1];
  }

  it('활성 세션이 있으면 어댑터로 전달한다', async () => {
    await build({});

    await service.onChzzkDonation(donation());

    expect(deliverDonation).toHaveBeenCalledWith(
      100,
      expect.objectContaining({
        playerId: '76561198083499333',
        platform: 'chzzk',
        donationType: 'CHAT',
        amount: 5000,
      }),
    );
    expect(routed().outcome).toBe('delivered');
  });

  it('활성 세션이 없으면 버리고 전달하지 않는다', async () => {
    await build({ session: null });

    await service.onChzzkDonation(donation());

    expect(deliverDonation).not.toHaveBeenCalled();
    expect(routed().outcome).toBe('no-session');
  });

  it('어댑터가 없는 게임이면 전달하지 않는다', async () => {
    await build({ adapter: null });

    await service.onChzzkDonation(donation());

    expect(routed().outcome).toBe('no-adapter');
  });

  it('게임 계정을 못 찾으면 실패로 처리한다', async () => {
    await build({ playerId: null });

    await service.onChzzkDonation(donation());

    expect(deliverDonation).not.toHaveBeenCalled();
    expect(routed().outcome).toBe('failed');
  });

  it('404(플레이어 미접속)면 세션을 닫는다', async () => {
    await build({ result: { status: 'player-absent' } });

    await service.onChzzkDonation(donation());

    expect(endByUser).toHaveBeenCalledWith(10, 'expired');
    expect(routed().outcome).toBe('player-absent');
  });

  it('그 외 전달 실패는 세션을 유지한다', async () => {
    await build({ result: { status: 'failed', reason: '500' } });

    await service.onChzzkDonation(donation());

    expect(endByUser).not.toHaveBeenCalled();
    expect(routed().outcome).toBe('failed');
  });

  it('라우팅 시점의 guildId를 결과 이벤트에 싣는다', async () => {
    await build({});

    await service.onChzzkDonation(donation());

    expect(routed().guildId).toBe('g1');
  });
});
