import { describe, expect, it } from '@jest/globals';
import { RealtimeSession } from '../../../../domain/entities/realtime-session.entity';
import { SessionCacheMapper } from './session-cache.mapper';

const user = {
  memberId: 1,
  email: 'u@test.com',
  name: 'tester',
  club: 'club',
  enrollmentNumber: '2024001',
  role: [],
};

describe('SessionCacheMapper', () => {
  it('maps realtime session to REALTIME snapshot', () => {
    const session = RealtimeSession.rehydrate({
      sessionId: 'rt-1',
      date: '2026-06-01',
      title: 'realtime',
      startTime: '10:00',
      endTime: '11:00',
      extendCount: 0,
      creatorName: 'creator',
      participationAvailable: true,
      status: 'ONAIR',
      attendanceList: [{ user, status: '참가', timeStamp: new Date('2026-06-01T10:00:00') }],
    });

    const snapshot = SessionCacheMapper.toSnapshot(session);

    expect(snapshot.sessionType).toBe('REALTIME');
    expect(snapshot.sessionId).toBe('rt-1');
    expect(snapshot.status).toBe('ONAIR');
  });

  it('defaults missing attendance timeStamp to Date on snapshot', () => {
    const session = RealtimeSession.rehydrate({
      sessionId: 'rt-2',
      date: '2026-06-01',
      title: 'realtime',
      startTime: '10:00',
      endTime: '11:00',
      extendCount: 0,
      creatorName: 'creator',
      participationAvailable: true,
      status: 'AFTER',
      attendanceList: [{ user, status: '참가', timeStamp: new Date() }],
    });

    const snapshot = SessionCacheMapper.toSnapshot(session);

    expect(snapshot.status).toBe('AFTER');
    expect(snapshot.attendanceList[0]?.timeStamp).toBeInstanceOf(Date);
  });
});
