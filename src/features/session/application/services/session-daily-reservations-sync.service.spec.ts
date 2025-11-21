import { describe, expect, it, jest, afterEach } from '@jest/globals';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { SessionDailyReservationsSyncService } from './session-daily-reservations-sync.service';
import { RESERVATION_DISCARD_GRACE_MS } from '../../domain/session.constant';

describe('SessionDailyReservationsSyncService (status on load)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('슬롯 시작 후 grace(10분) 이내는 BEFORE, 초과 시에만 DISCARDED', async () => {
    const payload = [
      {
        reservationId: 1,
        reservationType: 'REGULAR' as const,
        date: '2026-06-15',
        startTime: '10:00:00',
        endTime: '11:00:00',
        title: '연습',
        participationAvailable: true,
        creatorName: 'c',
      },
    ];

    const dailyReservationRead = {
      findTodayForSessionSync: jest.fn(async () => payload),
    };
    const dailyReservationsSyncQueue = {
      enqueueAndWait: jest.fn(async () => undefined),
      enqueue: jest.fn(async () => undefined),
    };

    const runSyncAt = async (now: Date) => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
      const added: { status?: string }[] = [];
      const sessionRuntimeManager = {
        clearSessions: jest.fn(),
        addReservationSessions: jest.fn(async (props: { status?: string }[]) => {
          added.push(...props);
        }),
      };
      const service = new SessionDailyReservationsSyncService(
        dailyReservationRead as never,
        dailyReservationsSyncQueue as never,
        sessionRuntimeManager as never,
      );
      await service.syncDailyReservations(payload);
      jest.useRealTimers();
      return added[0]?.status;
    };

    const startMs = AppKstDateTime.parseKstDateTime('2026-06-15', '10:00').getTime();

    const statusWithinGrace = await runSyncAt(
      new Date(startMs + RESERVATION_DISCARD_GRACE_MS - 60_000),
    );
    const statusAfterGrace = await runSyncAt(
      new Date(startMs + RESERVATION_DISCARD_GRACE_MS + 1),
    );

    expect(statusWithinGrace).toBe('BEFORE');
    expect(statusAfterGrace).toBe('DISCARDED');
  });
});
