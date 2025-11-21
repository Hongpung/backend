import { describe, expect, it } from '@jest/globals';
import { ReservationSession } from '../../../domain/entities/reservation-session.entity';
import { RealtimeSession } from '../../../domain/entities/realtime-session.entity';
import { SessionRestoreMapper } from './session.persistence.mapper';
import type {
  RealtimeSessionSnapshot,
  ReservationSessionSnapshot,
} from './session.persistence-model';

const user = {
  memberId: 1,
  email: 'u@test.com',
  name: 'tester',
  club: 'club',
  enrollmentNumber: '2024001',
  role: [],
};

describe('SessionRestoreMapper', () => {
  it('restores realtime snapshot with Date attendance timestamps', () => {
    const session = SessionRestoreMapper.fromSnapshot({
      sessionId: 'rt-1',
      date: '2026-06-01',
      sessionType: 'REALTIME',
      title: 'realtime',
      startTime: '10:00',
      endTime: '11:00',
      extendCount: 1,
      creatorName: 'creator',
      participationAvailable: true,
      status: 'ONAIR',
      attendanceList: [{ user, status: '참가', timeStamp: new Date() }],
    } satisfies RealtimeSessionSnapshot);

    expect(session).toBeInstanceOf(RealtimeSession);
    expect(session.sessionId).toBe('rt-1');
    expect(session.extendCount).toBe(1);
    expect(session.attendanceList[0]?.timeStamp).toBeInstanceOf(Date);
  });

  it('restores reservation snapshot preserving planned slot and compensation flag', () => {
    const session = SessionRestoreMapper.fromSnapshot({
      sessionId: 'res-1',
      reservationId: 10,
      reservationType: 'REGULAR',
      date: '2026-06-01',
      sessionType: 'RESERVED',
      title: 'reservation',
      startTime: '10:05',
      endTime: '11:00',
      extendCount: 2,
      creatorName: 'creator',
      participationAvailable: false,
      status: 'BEFORE',
      plannedStartTime: '10:00',
      slotAttendanceCompensationApplied: true,
      attendanceList: [{ user, status: '출석', timeStamp: new Date() }],
    } satisfies ReservationSessionSnapshot);

    expect(session).toBeInstanceOf(ReservationSession);
    expect((session as ReservationSession).plannedSlotStartHHmm).toBe('10:00');
    expect(
      (session as ReservationSession).slotAttendanceCompensationApplied,
    ).toBe(true);
  });
});
