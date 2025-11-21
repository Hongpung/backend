import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ReservationSession } from './reservation-session.entity';
import type { SessionUser } from '../value-objects/session-user.vo';

describe('ReservationSession', () => {
  const user = (id: number): SessionUser => ({
    memberId: id,
    email: `${id}@test.com`,
    name: `회원${id}`,
    club: '동아리',
    enrollmentNumber: `${id}`,
    role: [],
  });

  const baseProps = () => ({
    reservationId: 42,
    reservationType: 'REGULAR' as const,
    date: '2026-07-01',
    startTime: '10:00',
    endTime: '11:00',
    title: '연습',
    participationAvailable: true,
    creatorName: '생성자',
    creatorId: 99,
    attendanceList: [] as {
      user: SessionUser;
      status: '출석' | '결석' | '지각';
      timeStamp?: Date;
    }[],
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-01T02:30:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('create 시 기본 상태는 BEFORE이다', () => {
    const session = ReservationSession.create(baseProps());
    expect(session.status).toBe('BEFORE');
    expect(session.sessionType).toBe('RESERVED');
    expect(session.reservationId).toBe(42);
  });

  it('start 호출 시 BEFORE에서 ONAIR로 바뀌고 시작 시각이 KST HH:mm으로 갱신된다', () => {
    const session = ReservationSession.create(baseProps());
    session.start();
    expect(session.status).toBe('ONAIR');
    expect(session.startTime).toBe('11:30');
  });

  it('discard 호출 시 BEFORE에서 DISCARDED로 바뀐다', () => {
    const session = ReservationSession.create(baseProps());
    session.discard();
    expect(session.status).toBe('DISCARDED');
  });

  it('attend 신규 사용자를 목록에 추가한다', () => {
    const session = ReservationSession.create(baseProps());
    session.attend(user(1), '출석');
    expect(session.attendanceList).toHaveLength(1);
    expect(session.attendanceList[0]?.status).toBe('출석');
    expect(session.attendanceList[0]?.user.memberId).toBe(1);
  });

  it('attend 동일 사용자면 상태와 타임스탬프를 갱신한다', () => {
    const session = ReservationSession.create(baseProps());
    session.attend(user(1), '출석');
    session.attend(user(1), '지각');
    expect(session.attendanceList).toHaveLength(1);
    expect(session.attendanceList[0]?.status).toBe('지각');
  });

  it('rehydrate 주요 필드가 유지된다', () => {
    const original = ReservationSession.create({
      ...baseProps(),
      participatorIds: [1, 2],
      participators: [user(1)],
      borrowInstruments: [
        {
          instrumentId: 5,
          name: '기타',
          instrumentType: 'STRING',
          club: '동아리',
          borrowAvailable: true,
        },
      ],
    });

    const restored = ReservationSession.rehydrate({
      sessionId: original.sessionId,
      reservationId: original.reservationId,
      reservationType: original.reservationType,
      date: original.date,
      startTime: original.startTime,
      endTime: original.endTime,
      title: original.title,
      extendCount: original.extendCount,
      participationAvailable: original.participationAvailable,
      creatorName: original.creatorName,
      creatorId: original.creatorId,
      creatorNickname: original.creatorNickname,
      participators: [...original.participators],
      participatorIds: [...original.participatorIds],
      borrowInstruments: [...original.borrowInstruments],
      status: original.status,
      plannedStartTime: original.plannedSlotStartHHmm,
      slotAttendanceCompensationApplied:
        original.slotAttendanceCompensationApplied,
      attendanceList: [...original.attendanceList] as {
        user: SessionUser;
        status: '출석' | '결석' | '지각';
        timeStamp?: Date;
      }[],
    });

    expect(restored.reservationId).toBe(original.reservationId);
    expect(restored.date).toBe(original.date);
    expect(restored.startTime).toBe(original.startTime);
    expect(restored.status).toBe(original.status);
    expect(restored.participatorIds).toEqual([1, 2]);
    expect(restored.borrowInstruments).toHaveLength(1);
  });
});
