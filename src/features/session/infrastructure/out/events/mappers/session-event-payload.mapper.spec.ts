import { describe, expect, it } from '@jest/globals';
import { RealtimeSession } from '../../../../domain/entities/realtime-session.entity';
import { SessionEventPayloadMapper } from './session-event-payload.mapper';

const user = {
  memberId: 1,
  email: 'u@test.com',
  name: 'tester',
  club: 'club',
  enrollmentNumber: '2024001',
  role: [],
};

describe('SessionEventPayloadMapper', () => {
  it('maps realtime session to wire payload', () => {
    const session = RealtimeSession.rehydrate({
      sessionId: 'rt-1',
      date: '2026-06-01',
      title: 'realtime',
      startTime: '10:00',
      endTime: '11:00',
      extendCount: 1,
      creatorName: 'creator',
      creatorId: 7,
      participationAvailable: true,
      status: 'ONAIR',
      attendanceList: [{ user, status: '참가', timeStamp: new Date() }],
    });

    const payload = SessionEventPayloadMapper.toSessionPayload(session);

    expect(payload.sessionType).toBe('REALTIME');
    expect(payload.extendCount).toBe(1);
    expect(payload.creatorId).toBe(7);
  });

  it('maps AFTER status for ended realtime session', () => {
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

    const payload = SessionEventPayloadMapper.toSessionPayload(session);

    expect(payload.status).toBe('AFTER');
  });
});
