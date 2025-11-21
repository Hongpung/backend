import { describe, expect, it } from '@jest/globals';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { RealtimeSession } from '../../../../domain/entities/realtime-session.entity';
import { EndSessionLogDetailMapper } from './end-session-log-detail.mapper';

describe('EndSessionLogDetailMapper', () => {
  it('persist된 sessionLogId와 런타임 스냅샷으로 session-log 상세 shape를 만든다', () => {
    const session = RealtimeSession.rehydrate({
      sessionId: 'rt-1',
      date: '2030-06-15',
      title: '실시간',
      startTime: '10:00',
      endTime: '12:00',
      extendCount: 1,
      creatorName: 'Hong',
      creatorId: 7,
      creatorNickname: 'hp',
      participationAvailable: true,
      status: 'ONAIR',
      attendanceList: [
        {
          user: {
            memberId: 7,
            email: 'a@test.com',
            name: 'Hong',
            nickname: 'hp',
            club: 'Club',
            enrollmentNumber: '1',
            role: ['LEADER'],
          },
          status: '참가',
          timeStamp: AppKstDateTime.parseKstDateTime('2030-06-15', '10:00'),
        },
      ],
    });

    const detail = EndSessionLogDetailMapper.fromEndedSession({
      session,
      sessionLogId: 42,
      returnImageUrls: ['https://img/1.png'],
      forceEnd: false,
    });

    expect(detail.sessionId).toBe(42);
    expect(detail.sessionType).toBe('REALTIME');
    expect(detail.reservationType).toBeNull();
    expect(detail.returnImageUrl).toEqual(['https://img/1.png']);
    expect(detail.attendanceList).toHaveLength(1);
    expect(detail.attendanceList[0].member.memberId).toBe(7);
    expect(detail.borrowInstruments).toEqual([]);
  });
});
