import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { RealtimeSession } from '../../../domain/entities/realtime-session.entity';
import type { SessionUser } from '../../../domain/value-objects/session-user.vo';
import { SessionEndSnapshotBuilder } from './session-end-snapshot.builder';

describe('SessionEndSnapshotBuilder', () => {
  const user = (): SessionUser => ({
    memberId: 1,
    email: 'u@test.com',
    name: '홍길동',
    club: '동아리',
    enrollmentNumber: '2024001',
    role: [],
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('persist 요청 endTime은 예정 종료가 아니라 KST 현재 시각(1970-01-01 앵커)이다', () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(new Date('2026-04-25T03:00:00.000Z'));

    const session = RealtimeSession.rehydrate({
      sessionId: 'session-1',
      date: '2026-04-25',
      title: '실시간 연습',
      startTime: '09:00',
      endTime: '10:00',
      extendCount: 0,
      creatorName: '홍길동',
      creatorId: 1,
      participationAvailable: true,
      status: 'ONAIR',
      attendanceList: [{ user: user(), status: '참가', timeStamp: new Date() }],
    });

    const request = SessionEndSnapshotBuilder.toPersistRequest({
      session,
      returnImageUrls: null,
      forceEnd: false,
    });

    expect(request.endTime.toISOString()).toBe('1970-01-01T12:00:00.000Z');
    expect(request.endTime.toISOString()).not.toBe(
      AppKstDateTime.timeFormmatForDB(session.endTime).toISOString(),
    );
    expect(request.startTime.toISOString()).toBe(
      AppKstDateTime.timeFormmatForDB('09:00').toISOString(),
    );
  });
});
