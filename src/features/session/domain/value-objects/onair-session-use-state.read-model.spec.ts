import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { SessionDomainService } from '../runtime/session-domain.service';
import { ReservationSession } from '../entities/reservation-session.entity';
import { RealtimeSession } from '../entities/realtime-session.entity';
import type { SessionUser } from './session-user.vo';
import { OnairSessionUseStateReadModelFactory } from './onair-session-use-state.read-model';

describe('OnairSessionUseStateReadModelFactory', () => {
  const dummyUser = (): SessionUser => ({
    memberId: 1,
    email: 'u@test.com',
    name: '테스트',
    club: '동아리',
    enrollmentNumber: '2024001',
    role: [],
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('현재 세션이 없으면 NO_CURRENT_SESSION 사유를 준다', () => {
    jest.setSystemTime(new Date('2026-06-10T03:00:00.000Z'));
    const model = OnairSessionUseStateReadModelFactory.build({
      now: new Date(),
      currentSession: null,
      nextReservationSession: null,
      followingBeforeReservation: null,
      domainService: new SessionDomainService(),
    });
    expect(model.canEnd).toBe(false);
    expect(model.endBlockedReason).toBe('NO_CURRENT_SESSION');
    expect(model.extendBlockedReason).toBe('NO_CURRENT_SESSION');
  });

  it('실시간 세션 출석 목록 비면 NOT_ATTENDED', () => {
    jest.setSystemTime(new Date('2026-06-10T03:25:00.000Z'));
    const realtime = RealtimeSession.rehydrate({
      sessionId: 'r1',
      date: '2026-06-10',
      title: '실시간',
      startTime: '12:00',
      endTime: '12:30',
      extendCount: 0,
      creatorId: 1,
      creatorName: 'a',
      participationAvailable: true,
      status: 'ONAIR',
      attendanceList: [],
    });

    const model = OnairSessionUseStateReadModelFactory.build({
      now: new Date(),
      currentSession: realtime,
      nextReservationSession: null,
      followingBeforeReservation: null,
      domainService: new SessionDomainService(),
    });

    expect(model.endBlockedReason).toBe('NOT_ATTENDED');
    expect(model.extendBlockedReason).toBe('NOT_ATTENDED');
  });

  it('다음 예약 start − 10분까지는 연장 가능', () => {
    const current = ReservationSession.create({
      reservationId: 1,
      reservationType: 'REGULAR',
      date: '2026-06-05',
      startTime: '10:30',
      endTime: '11:00',
      title: 'cur',
      participationAvailable: false,
      creatorName: 'z',
      attendanceList: [
        { user: dummyUser(), status: '출석', timeStamp: new Date() },
      ],
    });
    const next = ReservationSession.create({
      reservationId: 2,
      reservationType: 'REGULAR',
      date: '2026-06-05',
      plannedStartTime: '11:15',
      startTime: '11:15',
      endTime: '12:00',
      title: 'n',
      participationAvailable: false,
      creatorName: 'z',
      attendanceList: [],
    });

    const startMs = AppKstDateTime.parseKstDateTime('2026-06-05', current.startTime).getTime();
    const now = new Date(startMs + 5 * 60 * 1000);
    jest.setSystemTime(now);
    current.start({ slotAttendanceCompensation: false });

    const model = OnairSessionUseStateReadModelFactory.build({
      now,
      currentSession: current,
      nextReservationSession: null,
      followingBeforeReservation: next,
      domainService: new SessionDomainService(),
    });

    expect(model.canExtend).toBe(true);
    expect(model.extendBlockedReason).toBe('NONE');
  });

  it('endTime이 다음 예약 start − 10분이면 NEXT_RESERVATION_CONFLICT', () => {
    const current = ReservationSession.create({
      reservationId: 1,
      reservationType: 'REGULAR',
      date: '2026-06-05',
      startTime: '10:30',
      endTime: '11:05',
      title: 'cur',
      participationAvailable: false,
      creatorName: 'z',
      attendanceList: [
        { user: dummyUser(), status: '출석', timeStamp: new Date() },
      ],
    });
    const next = ReservationSession.create({
      reservationId: 2,
      reservationType: 'REGULAR',
      date: '2026-06-05',
      plannedStartTime: '11:15',
      startTime: '11:15',
      endTime: '12:00',
      title: 'n',
      participationAvailable: false,
      creatorName: 'z',
      attendanceList: [],
    });

    const startMs = AppKstDateTime.parseKstDateTime('2026-06-05', current.startTime).getTime();
    const now = new Date(startMs + 5 * 60 * 1000);
    jest.setSystemTime(now);
    current.start({ slotAttendanceCompensation: false });

    const model = OnairSessionUseStateReadModelFactory.build({
      now,
      currentSession: current,
      nextReservationSession: null,
      followingBeforeReservation: next,
      domainService: new SessionDomainService(),
    });

    expect(model.canExtend).toBe(false);
    expect(model.extendBlockedReason).toBe('NEXT_RESERVATION_CONFLICT');
  });

  it('endTime이 CLOSE_HOUR이면 OPERATING_HOURS_EXCEEDED', () => {
    const current = ReservationSession.create({
      reservationId: 1,
      reservationType: 'REGULAR',
      date: '2026-06-05',
      startTime: '21:00',
      endTime: '22:00',
      title: 'x',
      participationAvailable: false,
      creatorName: 'z',
      attendanceList: [
        {
          user: {
            memberId: 1,
            email: 'a@b.c',
            name: 'u',
            club: 'c',
            enrollmentNumber: '1',
            role: [],
          },
          status: '출석',
          timeStamp: new Date('2026-06-05T12:00:00.000Z'),
        },
      ],
    });

    const startMs = AppKstDateTime.parseKstDateTime('2026-06-05', current.startTime).getTime();
    const now = new Date(startMs + 5 * 60 * 1000);
    jest.setSystemTime(now);
    current.start({ slotAttendanceCompensation: false });

    const model = OnairSessionUseStateReadModelFactory.build({
      now,
      currentSession: current,
      nextReservationSession: null,
      followingBeforeReservation: null,
      domainService: new SessionDomainService(),
    });

    expect(model.canExtend).toBe(false);
    expect(model.extendBlockedReason).toBe('OPERATING_HOURS_EXCEEDED');
  });
});
