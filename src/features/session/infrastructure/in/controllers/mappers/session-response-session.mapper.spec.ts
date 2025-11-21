import { describe, expect, it } from '@jest/globals';
import { RealtimeSession } from '../../../../domain/entities/realtime-session.entity';
import { SessionResponseSessionMapper } from './session-response-session.mapper';

const user = {
  memberId: 1,
  email: 'u@test.com',
  name: 'tester',
  club: 'club',
  enrollmentNumber: '2024001',
  role: [],
};

describe('SessionResponseSessionMapper', () => {
  it('maps realtime session to REALTIME wire payload', () => {
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
      attendanceList: [{ user, status: '참가', timeStamp: new Date() }],
    });

    const payload = SessionResponseSessionMapper.toResponse(session);

    expect(payload.sessionType).toBe('REALTIME');
    expect(payload.sessionId).toBe('rt-1');
  });

  it('maps AFTER realtime session to AFTER wire status', () => {
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
      attendanceList: [],
    });

    const payload = SessionResponseSessionMapper.toResponse(session);

    expect(payload.status).toBe('AFTER');
  });
});
