import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import {
  ATTENDANCE_ON_TIME_AFTER_START_MS,
  RESERVATION_DISCARD_GRACE_COMPENSATED_MS,
  RESERVATION_DISCARD_GRACE_MS,
} from '../session.constant';
import { ReservationSession } from '../entities/reservation-session.entity';
import { RealtimeSession } from '../entities/realtime-session.entity';
import { SessionDomainService } from './session-domain.service';
import type { SessionUser } from '../value-objects/session-user.vo';

describe('SessionDomainService', () => {
  let service: SessionDomainService;

  const dummyUser = (): SessionUser => ({
    memberId: 1,
    email: 'u@test.com',
    name: '테스트',
    club: '동아리',
    enrollmentNumber: '2024001',
    role: [],
  });

  const reservationBefore = (): ReservationSession =>
    ReservationSession.create({
      reservationId: 100,
      reservationType: 'REGULAR',
      date: '2026-06-01',
      startTime: '10:00',
      endTime: '11:00',
      title: '연습',
      participationAvailable: false,
      creatorName: '생성자',
      creatorId: 9,
      attendanceList: [],
    });

  beforeEach(() => {
    service = new SessionDomainService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isLateAttendance', () => {
    it('허용 임계값 이내면 지각이 아니다', () => {
      const session = reservationBefore();
      const slot = AppKstDateTime.parseKstDateTime(session.date, session.plannedSlotStartHHmm);
      const attendTime = new Date(
        slot.getTime() + ATTENDANCE_ON_TIME_AFTER_START_MS,
      );

      expect(service.isLateAttendance(session, attendTime, false)).toBe(false);
    });

    it('허용 임계값을 넘으면 지각이다', () => {
      const session = reservationBefore();
      const slot = AppKstDateTime.parseKstDateTime(session.date, session.plannedSlotStartHHmm);
      const attendTime = new Date(
        slot.getTime() + ATTENDANCE_ON_TIME_AFTER_START_MS + 1,
      );

      expect(service.isLateAttendance(session, attendTime, false)).toBe(true);
    });
  });

  describe('getLateAttendanceMinutes', () => {
    it('슬롯 시작 시각 대비 지각 분을 올림한다', () => {
      const session = reservationBefore();
      const slot = AppKstDateTime.parseKstDateTime(
        session.date,
        session.plannedSlotStartHHmm,
      );
      const attendTime = new Date(slot.getTime() + 12 * 60 * 1000 + 1);

      expect(service.getLateAttendanceMinutes(session, attendTime)).toBe(13);
    });

    it('슬롯 시작 이전이면 0분이다', () => {
      const session = reservationBefore();
      const slot = AppKstDateTime.parseKstDateTime(
        session.date,
        session.plannedSlotStartHHmm,
      );
      const attendTime = new Date(slot.getTime() - 60_000);

      expect(service.getLateAttendanceMinutes(session, attendTime)).toBe(0);
    });
  });

  describe('findNextSchedulableReservation', () => {
    it('목록이 비어 있으면 null이다', () => {
      expect(
        service.findNextSchedulableReservation([], null, Date.now()),
      ).toBeNull();
    });

    it('실시간 세션만 있으면 null이다', () => {
      const rt = RealtimeSession.create({
        participationAvailable: true,
        attendanceList: [
          { user: dummyUser(), status: '참가', timeStamp: new Date() },
        ],
        creatorName: '생성자',
        creatorId: 1,
      });

      expect(
        service.findNextSchedulableReservation([rt], null, Date.now()),
      ).toBeNull();
    });

    it('BEFORE 예약 세션 중 stale이 아닌 첫 항목을 반환한다', () => {
      const fresh = reservationBefore();
      const stale = ReservationSession.create({
        reservationId: 101,
        reservationType: 'REGULAR',
        date: '2026-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '오래된 예약',
        participationAvailable: false,
        creatorName: '생성자',
        attendanceList: [],
      });

      const staleStart = AppKstDateTime.parseKstDateTime(
        stale.date,
        stale.plannedSlotStartHHmm,
      );
      const nowMs =
        staleStart.getTime() + RESERVATION_DISCARD_GRACE_MS + 60_000;

      const next = service.findNextSchedulableReservation(
        [stale, fresh],
        null,
        nowMs,
      );
      expect(next).not.toBeNull();
      expect(next!.reservationId).toBe(fresh.reservationId);
    });

    it('모든 BEFORE 예약이 stale이면 null이다', () => {
      const stale = ReservationSession.create({
        reservationId: 102,
        reservationType: 'REGULAR',
        date: '2026-01-01',
        startTime: '09:00',
        endTime: '10:00',
        title: '오래된 예약',
        participationAvailable: false,
        creatorName: '생성자',
        attendanceList: [],
      });
      const start = AppKstDateTime.parseKstDateTime(stale.date, stale.plannedSlotStartHHmm);
      const nowMs = start.getTime() + RESERVATION_DISCARD_GRACE_MS + 1;

      expect(
        service.findNextSchedulableReservation([stale], null, nowMs),
      ).toBeNull();
    });

    it('현재 세션이 선시작 창과 겹치면 다음 예약에 보상 유예가 적용된다', () => {
      const b = ReservationSession.create({
        reservationId: 203,
        reservationType: 'REGULAR',
        date: '2026-06-02',
        startTime: '12:30',
        endTime: '14:00',
        title: 'B',
        participationAvailable: false,
        creatorName: 'c',
        attendanceList: [],
      });

      const onAir = RealtimeSession.rehydrate({
        sessionId: 'rt-1',
        date: '2026-06-02',
        title: 'A',
        startTime: '12:00',
        endTime: '12:35',
        extendCount: 0,
        creatorName: 'x',
        participationAvailable: true,
        status: 'ONAIR',
        attendanceList: [
          {
            user: dummyUser(),
            status: '참가',
            timeStamp: new Date(),
          },
        ],
      });

      const slotMs = AppKstDateTime.parseKstDateTime(b.date, b.plannedSlotStartHHmm).getTime();
      const nowComp = slotMs + 12 * 60 * 1000;

      expect(
        service.findNextSchedulableReservation([b], onAir, nowComp),
      ).not.toBeNull();

      const onAirNoOverlap = RealtimeSession.rehydrate({
        sessionId: 'rt-2',
        date: '2026-06-02',
        title: 'A',
        startTime: '12:00',
        endTime: '12:15',
        extendCount: 0,
        creatorName: 'x',
        participationAvailable: true,
        status: 'ONAIR',
        attendanceList: [
          {
            user: dummyUser(),
            status: '참가',
            timeStamp: new Date(),
          },
        ],
      });

      const nextNoOverlap = service.findNextSchedulableReservation(
        [b],
        onAirNoOverlap,
        nowComp,
      );
      expect(nextNoOverlap).toBeNull();
    });
  });

  describe('calculateDiscardDelay', () => {
    it('시작 시각까지 남은 시간에 grace를 더한 지연(ms)을 반환한다', () => {
      jest.setSystemTime(new Date('2026-06-01T01:00:00.000Z'));
      const session = reservationBefore();
      const start = AppKstDateTime.parseKstDateTime(
        session.date,
        session.plannedSlotStartHHmm,
      );
      const expected =
        start.getTime() - Date.now() + RESERVATION_DISCARD_GRACE_MS;

      expect(service.calculateDiscardDelay(session, false)).toBe(expected);
    });

    it('보상 적용 시 grace가 확장된다', () => {
      jest.setSystemTime(new Date('2026-06-01T01:00:00.000Z'));
      const session = reservationBefore();
      const start = AppKstDateTime.parseKstDateTime(
        session.date,
        session.plannedSlotStartHHmm,
      );
      const expected =
        start.getTime() - Date.now() + RESERVATION_DISCARD_GRACE_COMPENSATED_MS;

      expect(service.calculateDiscardDelay(session, true)).toBe(expected);
    });
  });

  describe('session extend cap', () => {
    it('후속 예약 없으면 CLOSE_HOUR가 상한', () => {
      const cur = ReservationSession.create({
        reservationId: 1,
        reservationType: 'REGULAR',
        date: '2026-06-05',
        startTime: '21:00',
        endTime: '21:30',
        title: 'x',
        participationAvailable: false,
        creatorName: 'z',
        attendanceList: [],
      });

      const ctx = { currentSession: cur, followingReservation: null };
      expect(service.resolveExtendEndMs(ctx)).toBe(
        AppKstDateTime.parseKstDateTime('2026-06-05', '22:00').getTime(),
      );
      expect(service.isExtendAtMaxCap(ctx)).toBe(false);
    });

    it('30분 연장이 CLOSE_HOUR를 넘으면 CLOSE_HOUR까지만 연장', () => {
      const cur = ReservationSession.create({
        reservationId: 1,
        reservationType: 'REGULAR',
        date: '2026-06-05',
        startTime: '21:00',
        endTime: '21:45',
        title: 'x',
        participationAvailable: false,
        creatorName: 'z',
        attendanceList: [],
      });

      const ctx = { currentSession: cur, followingReservation: null };
      expect(service.resolveExtendEndMs(ctx)).toBe(
        AppKstDateTime.parseKstDateTime('2026-06-05', '22:00').getTime(),
      );
      expect(service.isExtendAtMaxCap(ctx)).toBe(false);
    });

    it('endTime이 CLOSE_HOUR이면 더 연장 불가', () => {
      const cur = ReservationSession.create({
        reservationId: 1,
        reservationType: 'REGULAR',
        date: '2026-06-05',
        startTime: '21:00',
        endTime: '22:00',
        title: 'x',
        participationAvailable: false,
        creatorName: 'z',
        attendanceList: [],
      });

      const ctx = { currentSession: cur, followingReservation: null };
      expect(service.isExtendAtMaxCap(ctx)).toBe(true);
      expect(service.getExtendMaxCapBlockedReason(ctx)).toBe(
        'OPERATING_HOURS_EXCEEDED',
      );
    });

    it('다음 예약 start − 10분까지 부분 연장', () => {
      const cur = ReservationSession.create({
        reservationId: 1,
        reservationType: 'REGULAR',
        date: '2026-06-05',
        startTime: '10:30',
        endTime: '10:58',
        title: 'x',
        participationAvailable: false,
        creatorName: 'z',
        attendanceList: [],
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

      const ctx = { currentSession: cur, followingReservation: next };
      expect(service.resolveExtendEndMs(ctx)).toBe(
        AppKstDateTime.parseKstDateTime('2026-06-05', '11:05').getTime(),
      );
      expect(service.isExtendAtMaxCap(ctx)).toBe(false);
    });

    it('endTime이 다음 예약 start − 10분이면 더 연장 불가', () => {
      const cur = ReservationSession.create({
        reservationId: 1,
        reservationType: 'REGULAR',
        date: '2026-06-05',
        startTime: '10:30',
        endTime: '11:05',
        title: 'x',
        participationAvailable: false,
        creatorName: 'z',
        attendanceList: [],
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

      const ctx = { currentSession: cur, followingReservation: next };
      expect(service.isExtendAtMaxCap(ctx)).toBe(true);
      expect(service.getExtendMaxCapBlockedReason(ctx)).toBe(
        'NEXT_RESERVATION_CONFLICT',
      );
    });
  });

  describe('findFollowingBeforeReservation', () => {
    it('현재 다음에 오는 BEFORE 예약 세션만 반환한다', () => {
      const a = reservationBefore();
      const b = ReservationSession.create({
        reservationId: 2,
        reservationType: 'REGULAR',
        date: '2026-06-01',
        startTime: '12:00',
        endTime: '13:00',
        title: 'b',
        participationAvailable: false,
        creatorName: 'z',
        attendanceList: [],
      });

      expect(
        service.findFollowingBeforeReservation([a, b], String(a.sessionId))
          ?.reservationId,
      ).toBe(b.reservationId);
    });
  });
});
