import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { RealtimeSession } from './realtime-session.entity';
import type { SessionUser } from '../value-objects/session-user.vo';

describe('RealtimeSession', () => {
  const user = (): SessionUser => ({
    memberId: 1,
    email: 'u@test.com',
    name: '홍길동',
    club: '동아리',
    enrollmentNumber: '2024001',
    role: [],
  });

  const rehydrateFrom = (
    session: RealtimeSession,
    status: 'ONAIR' | 'AFTER' = session.status as 'ONAIR' | 'AFTER',
  ) =>
    RealtimeSession.rehydrate({
      sessionId: session.sessionId,
      date: session.date,
      title: session.title,
      startTime: session.startTime,
      endTime: session.endTime,
      extendCount: session.extendCount,
      creatorName: session.creatorName,
      creatorId: session.creatorId,
      creatorNickname: session.creatorNickname,
      participationAvailable: session.participationAvailable,
      status,
      attendanceList: [...session.attendanceList] as {
        user: SessionUser;
        status: '참가';
        timeStamp: Date;
      }[],
    });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-01T03:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('create 시 참가자 한 명과 함께 ONAIR 상태로 생성된다', () => {
    const session = RealtimeSession.create({
      participationAvailable: true,
      attendanceList: [{ user: user(), status: '참가', timeStamp: new Date() }],
      creatorName: '홍길동',
      creatorId: 1,
    });

    expect(session.status).toBe('ONAIR');
    expect(session.sessionType).toBe('REALTIME');
    expect(session.attendanceList).toHaveLength(1);
    expect(session.title).toContain('실시간');
  });

  it('attend 호출 시 참가 목록에 추가된다', () => {
    const session = RealtimeSession.create({
      participationAvailable: true,
      attendanceList: [{ user: user(), status: '참가', timeStamp: new Date() }],
      creatorName: '홍길동',
      creatorId: 1,
    });

    session.attend({
      ...user(),
      memberId: 2,
      name: '김철수',
    });

    expect(session.attendanceList.length).toBeGreaterThanOrEqual(2);
    const last = session.attendanceList[session.attendanceList.length - 1];
    expect(last?.status).toBe('참가');
    expect(last?.user.memberId).toBe(2);
  });

  it('rehydrate 후 주요 필드가 유지된다', () => {
    const session = RealtimeSession.create({
      participationAvailable: false,
      attendanceList: [{ user: user(), status: '참가', timeStamp: new Date() }],
      creatorName: '홍길동',
      creatorId: 1,
      creatorNickname: 'hong',
    });

    const restored = rehydrateFrom(session);

    expect(restored.sessionId).toBe(session.sessionId);
    expect(restored.status).toBe('ONAIR');
    expect(restored.creatorNickname).toBe('hong');
    expect(restored.participationAvailable).toBe(false);
  });

  it('ONAIR 상태에서 end 호출 시 AFTER로 바뀐다', () => {
    const session = RealtimeSession.create({
      participationAvailable: true,
      attendanceList: [{ user: user(), status: '참가', timeStamp: new Date() }],
      creatorName: '홍길동',
      creatorId: 1,
    });

    session.end();
    expect(session.status).toBe('AFTER');
  });

  it('ONAIR가 아닐 때 end 호출 시 에러가 발생한다', () => {
    const created = RealtimeSession.create({
      participationAvailable: true,
      attendanceList: [{ user: user(), status: '참가', timeStamp: new Date() }],
      creatorName: '홍길동',
      creatorId: 1,
    });

    const session = rehydrateFrom(created, 'AFTER');

    expect(() => session.end()).toThrow('Status Error');
  });

  it('ONAIR 상태에서 extend 호출 시 연장 횟수가 증가한다', () => {
    const session = RealtimeSession.create({
      participationAvailable: true,
      attendanceList: [{ user: user(), status: '참가', timeStamp: new Date() }],
      creatorName: '홍길동',
      creatorId: 1,
    });

    const beforeCount = session.extendCount;
    session.extend();

    expect(session.extendCount).toBe(beforeCount + 1);
  });

  it('ONAIR가 아닐 때 extend 호출 시 에러가 발생한다', () => {
    const created = RealtimeSession.create({
      participationAvailable: true,
      attendanceList: [{ user: user(), status: '참가', timeStamp: new Date() }],
      creatorName: '홍길동',
      creatorId: 1,
    });

    const session = rehydrateFrom(created, 'AFTER');

    expect(() => session.extend()).toThrow('Status Error');
  });
});
