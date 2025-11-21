import { describe, expect, it } from '@jest/globals';
import { RealtimeSession } from '../../../../domain/entities/realtime-session.entity';
import { SessionJobPayloadMapper } from './session-job-payload.mapper';

const user = {
  memberId: 1,
  email: 'u@test.com',
  name: 'tester',
  club: 'club',
  enrollmentNumber: '2024001',
  role: [],
};

describe('SessionJobPayloadMapper', () => {
  it('maps realtime session to force-end wire payload', () => {
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

    const payload = SessionJobPayloadMapper.toForceEndPayload(session);

    expect(payload.sessionType).toBe('REALTIME');
    expect(payload.sessionId).toBe('rt-1');
  });

  it('preserves ONAIR status when session is still active', () => {
    const session = RealtimeSession.rehydrate({
      sessionId: 'rt-2',
      date: '2026-06-01',
      title: 'realtime',
      startTime: '10:00',
      endTime: '11:00',
      extendCount: 2,
      creatorName: 'creator',
      participationAvailable: false,
      status: 'ONAIR',
      attendanceList: [],
    });

    const payload = SessionJobPayloadMapper.toForceEndPayload(session);

    expect(payload.status).toBe('ONAIR');
    expect(payload.extendCount).toBe(2);
  });
});
