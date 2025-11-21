import { describe, expect, it } from '@jest/globals';
import { RealtimeSession } from '../../domain/entities/realtime-session.entity';
import { ReservationSession } from '../../domain/entities/reservation-session.entity';
import { SessionRestorePolicy } from './session-restore.policy';

const user = {
  memberId: 1,
  email: 'u@test.com',
  name: 'tester',
  club: 'club',
  enrollmentNumber: '2024001',
  role: [],
};

const onAir = (endTime: string) =>
  RealtimeSession.rehydrate({
    sessionId: `rt-${endTime}`,
    date: '2026-06-01',
    title: 'realtime',
    startTime: '10:00',
    endTime,
    extendCount: 0,
    creatorName: 'creator',
    participationAvailable: true,
    status: 'ONAIR',
    attendanceList: [{ user, status: '참가', timeStamp: new Date() }],
  });

const reservation = (
  reservationType: 'REGULAR' | 'EXTERNAL',
  date = '2026-06-01',
) =>
  ReservationSession.create({
    reservationId: reservationType === 'EXTERNAL' ? 2 : 1,
    reservationType,
    date,
    startTime: '12:00',
    endTime: '13:00',
    title: 'reservation',
    participationAvailable: false,
    creatorName: 'creator',
    attendanceList: [],
  });

describe('SessionRestorePolicy', () => {
  it('validates cached date against today', () => {
    expect(
      SessionRestorePolicy.isCacheDateValid('2026-06-01', '2026-06-01'),
    ).toBe(true);
    expect(
      SessionRestorePolicy.isCacheDateValid('2026-05-31', '2026-06-01'),
    ).toBe(false);
  });

  it('keeps only sessions whose date matches today KST', () => {
    const kept = SessionRestorePolicy.filterSessionsForKstDay(
      [
        reservation('REGULAR', '2026-06-01'),
        reservation('REGULAR', '2026-05-31'),
      ],
      '2026-06-01',
    );

    expect(kept).toHaveLength(1);
    expect(kept[0]?.date).toBe('2026-06-01');
  });

  it('accepts legacy ISO snapshot dates on the same KST day', () => {
    expect(
      SessionRestorePolicy.isCacheDateValid(
        '2026-05-23T15:00:00.028Z',
        '2026-05-24',
      ),
    ).toBe(true);
  });

  it('marks expired ONAIR sessions for ending', () => {
    const [action] = SessionRestorePolicy.actionsForBootstrap(
      [onAir('09:00')],
      new Date('2026-06-01T20:00:00.000Z'),
    );

    expect(action.type).toBe('END_EXPIRED_ONAIR');
  });

  it('schedules active ONAIR sessions', () => {
    const [action] = SessionRestorePolicy.actionsForBootstrap(
      [onAir('23:00')],
      new Date('2026-06-01T00:00:00.000Z'),
    );

    expect(action.type).toBe('SCHEDULE_FORCE_END');
    if (action.type === 'SCHEDULE_FORCE_END') {
      expect(action.delayMs).toBeGreaterThan(0);
    }
  });

  it('schedules external reservation start jobs', () => {
    const [action] = SessionRestorePolicy.actionsForBootstrap(
      [reservation('EXTERNAL')],
      new Date('2026-06-01T00:00:00.000Z'),
    );

    expect(action.type).toBe('SCHEDULE_EXTERNAL_START');
  });

  it('marks stale internal reservations for server-down discard', () => {
    const [action] = SessionRestorePolicy.actionsForBootstrap(
      [reservation('REGULAR', '2026-05-31')],
      new Date('2026-06-01T20:00:00.000Z'),
    );

    expect(action.type).toBe('SERVER_DOWN_DISCARD');
  });
});
