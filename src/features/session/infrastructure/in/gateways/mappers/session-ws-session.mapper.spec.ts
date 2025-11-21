import { describe, expect, it } from '@jest/globals';
import { RealtimeSession } from '../../../../domain/entities/realtime-session.entity';
import { SessionWebSocketMapper } from './session-ws-session.mapper';

const user = {
  memberId: 1,
  email: 'u@test.com',
  name: 'tester',
  club: 'club',
  enrollmentNumber: '2024001',
  role: [],
};

describe('SessionWebSocketMapper', () => {
  it('maps realtime session to websocket wire payload', () => {
    const session = RealtimeSession.rehydrate({
      sessionId: 'rt-1',
      date: '2026-06-01',
      title: 'realtime',
      startTime: '10:00',
      endTime: '11:00',
      extendCount: 0,
      creatorName: 'creator',
      creatorNickname: 'hp',
      participationAvailable: true,
      status: 'ONAIR',
      attendanceList: [{ user, status: '참가', timeStamp: new Date() }],
    });

    const payload = SessionWebSocketMapper.toPayload(session);

    expect(payload.sessionType).toBe('REALTIME');
    expect(payload.creatorNickname).toBe('hp');
  });

  it('maps AFTER realtime session status to wire AFTER', () => {
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

    const payload = SessionWebSocketMapper.toPayload(session);

    expect(payload.status).toBe('AFTER');
  });
});
