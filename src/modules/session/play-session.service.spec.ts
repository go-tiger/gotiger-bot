import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlaySession } from '../../common/entities/play-session.entity';
import { GameServer } from '../../common/entities/game-server.entity';
import { PlaySessionService } from './play-session.service';

/** 저장은 하지 않고 호출만 기록하는 최소 스텁. */
function createSessionRepository(seed: PlaySession[] = []) {
  const rows = [...seed];
  let nextId = rows.length + 1;

  return {
    rows,
    findOne: jest.fn(({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(
        rows.find(
          (row) =>
            Object.entries(where).every(
              ([key, value]) => row[key as keyof PlaySession] === value,
            ) || false,
        ) ?? null,
      ),
    ),
    find: jest.fn(({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(
        rows.filter((row) =>
          Object.entries(where).every(
            ([key, value]) => row[key as keyof PlaySession] === value,
          ),
        ),
      ),
    ),
    create: jest.fn((data: Partial<PlaySession>) => ({ ...data })),
    save: jest.fn((data: PlaySession) => {
      if (!data.id) {
        data.id = nextId++;
        rows.push(data);
      }
      return Promise.resolve(data);
    }),
  };
}

function session(overrides: Partial<PlaySession>): PlaySession {
  return {
    id: 1,
    userId: 10,
    gameServerId: 100,
    status: 'active',
    startedAt: new Date('2026-07-30T12:00:00Z'),
    endedAt: null,
    ...overrides,
  } as PlaySession;
}

describe('PlaySessionService', () => {
  let service: PlaySessionService;
  let sessionRepository: ReturnType<typeof createSessionRepository>;

  async function build(seed: PlaySession[] = []) {
    sessionRepository = createSessionRepository(seed);

    const moduleRef = await Test.createTestingModule({
      providers: [
        PlaySessionService,
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        {
          provide: getRepositoryToken(PlaySession),
          useValue: sessionRepository,
        },
        {
          provide: getRepositoryToken(GameServer),
          useValue: {
            findOne: jest.fn(() =>
              Promise.resolve({ id: 100, guildId: 'g1' } as GameServer),
            ),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(PlaySessionService);
  }

  describe('start', () => {
    it('같은 서버에 이미 세션이 있으면 새로 만들지 않는다', async () => {
      await build([session({})]);

      await service.start(10, 100, new Date('2026-07-30T12:05:00Z'));

      expect(sessionRepository.rows).toHaveLength(1);
    });

    it('다른 서버에서 입장하면 최신 것으로 교체한다', async () => {
      await build([session({})]);

      const created = await service.start(
        10,
        200,
        new Date('2026-07-30T12:10:00Z'),
      );

      expect(sessionRepository.rows[0].status).toBe('ended');
      expect(created?.gameServerId).toBe(200);
    });

    it('기존 세션보다 이전 시각의 입장 보고는 무시한다', async () => {
      await build([session({ startedAt: new Date('2026-07-30T12:00:00Z') })]);

      const result = await service.start(
        10,
        200,
        new Date('2026-07-30T11:59:00Z'),
      );

      expect(result?.gameServerId).toBe(100);
      expect(sessionRepository.rows[0].status).toBe('active');
    });
  });

  describe('end', () => {
    it('세션 시작보다 이전에 발생한 퇴장은 무시한다', async () => {
      await build([session({ startedAt: new Date('2026-07-30T12:00:00Z') })]);

      await service.end(10, 100, new Date('2026-07-30T11:59:00Z'));

      expect(sessionRepository.rows[0].status).toBe('active');
    });

    it('다른 서버의 퇴장 보고는 무시한다', async () => {
      await build([session({})]);

      await service.end(10, 999, new Date('2026-07-30T12:30:00Z'));

      expect(sessionRepository.rows[0].status).toBe('active');
    });

    it('정상 퇴장은 세션을 닫는다', async () => {
      await build([session({})]);

      await service.end(10, 100, new Date('2026-07-30T12:30:00Z'));

      expect(sessionRepository.rows[0].status).toBe('ended');
    });
  });

  describe('syncFromHeartbeat', () => {
    it('목록에 없는 세션을 닫는다', async () => {
      await build([session({})]);

      await service.syncFromHeartbeat(100, [], new Date());

      expect(sessionRepository.rows[0].status).toBe('ended');
    });

    it('목록에 새로 등장한 스트리머의 세션을 연다', async () => {
      await build([]);

      await service.syncFromHeartbeat(
        100,
        [10],
        new Date('2026-07-30T12:00:00Z'),
      );

      expect(sessionRepository.rows).toHaveLength(1);
      expect(sessionRepository.rows[0].userId).toBe(10);
    });

    it('다른 서버의 세션은 건드리지 않는다', async () => {
      await build([session({ gameServerId: 777 })]);

      await service.syncFromHeartbeat(100, [], new Date());

      expect(sessionRepository.rows[0].status).toBe('active');
    });
  });
});
