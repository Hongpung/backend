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
  RESERVATION_DISCARD_GRACE_MS,
  STARTABLE_WINDOW_BEFORE_MS,
  CREATABLE_MIN_GAP_MS,
} from '../session.constant';
import { CheckInStateReadVo } from './check-in-state-read.vo';
import { ReservationSession } from '../entities/reservation-session.entity';

describe('CheckInStateReadVo', () => {
  const baseReservation = (): ReservationSession =>
    ReservationSession.create({
      reservationId: 1,
      reservationType: 'REGULAR',
      date: '2026-06-15',
      title: '연습',
      startTime: '14:00',
      endTime: '15:00',
      creatorId: 10,
      creatorName: '생성자',
      participationAvailable: true,
      participators: [],
      participatorIds: [],
      borrowInstruments: [],
      attendanceList: [],
    });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('다음 예약이 없으면 생성 가능 상태로 판단한다', () => {
    const vo = CheckInStateReadVo.from(null, null);
    expect(vo.isCreatable).toBe(true);
    expect(vo.normalizedNextReservationSession).toBeNull();
  });

  it('다음 예약이 stale이면 생성 가능하고 정규화 시 null이다', () => {
    const reservation = baseReservation();
    const start = AppKstDateTime.parseKstDateTime(reservation.date, reservation.startTime);
    jest.setSystemTime(
      new Date(start.getTime() + RESERVATION_DISCARD_GRACE_MS + 1000),
    );

    const vo = CheckInStateReadVo.from(reservation, null);
    expect(vo.isNextSessionStale).toBe(true);
    expect(vo.isCreatable).toBe(true);
    expect(vo.normalizedNextReservationSession).toBeNull();
  });

  it('시작까지 간격이 creatable 최소 간격보다 크면 생성 가능이다', () => {
    const reservation = baseReservation();
    const start = AppKstDateTime.parseKstDateTime(reservation.date, reservation.startTime);
    jest.setSystemTime(
      new Date(start.getTime() - CREATABLE_MIN_GAP_MS - 60_000),
    );

    const vo = CheckInStateReadVo.from(reservation, null);
    expect(vo.isCreatable).toBe(true);
  });

  it('슬롯 시작 시점 가까우면 시작 가능 창 안에 들어간다', () => {
    const reservation = baseReservation();
    const start = AppKstDateTime.parseKstDateTime(reservation.date, reservation.startTime);
    jest.setSystemTime(new Date(start.getTime()));

    const vo = CheckInStateReadVo.from(reservation, null);
    expect(vo.isInStartableWindow).toBe(true);
    expect(vo.isCreatable).toBe(false);
  });

  it('시작까지 간격이 시작 가능 창 밖이면 시작 가능 창이 아니다', () => {
    const reservation = baseReservation();
    const start = AppKstDateTime.parseKstDateTime(reservation.date, reservation.startTime);
    jest.setSystemTime(
      new Date(start.getTime() - STARTABLE_WINDOW_BEFORE_MS - 60_000),
    );

    const vo = CheckInStateReadVo.from(reservation, null);
    expect(vo.isInStartableWindow).toBe(false);
  });
});
