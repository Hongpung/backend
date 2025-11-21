import { describe, expect, it } from '@jest/globals';
import {
  maskEmail,
  maskEndSessionResultForLog,
  maskPersonalName,
  maskSessionLogDetailForLog,
} from './session-pii-log.util';
import type { SessionLogDetailReadModel } from '../../domain/read-models/session-log-detail.read-model';

describe('session-pii-log.util', () => {
  it('email·이름은 마스킹하고 memberId(PK)는 그대로 둔다', () => {
    expect(maskEmail('user@example.com')).toBe('u***@example.com');
    expect(maskPersonalName('홍길동')).toBe('홍***');
  });

  it('sessionLogDetail 로그 payload에 이름·이미지 URL 원문을 넣지 않는다', () => {
    const detail: SessionLogDetailReadModel = {
      sessionId: 99,
      creatorId: 101,
      creatorName: '참석자',
      creatorNickname: null,
      title: '연습',
      date: '2030-06-15',
      startTime: '10:00',
      endTime: '12:00',
      sessionType: 'REALTIME',
      reservationType: null,
      participationAvailable: true,
      forceEnd: false,
      extendCount: 0,
      returnImageUrl: ['https://cdn.example.com/a.png'],
      reservationId: null,
      attendanceList: [
        {
          member: {
            memberId: 101,
            name: '참석자',
            nickname: null,
            blogUrl: null,
            enrollmentNumber: '2021001',
            profileImageUrl: null,
            instagramUrl: null,
            club: '동아리',
            role: ['LEADER'],
          },
          status: '참가',
          timeStamp: '10:00',
        },
      ],
      borrowInstruments: [],
    };

    const masked = maskSessionLogDetailForLog(detail);

    expect(masked.creatorName).toBe('참***');
    expect(masked.creatorId).toBe(101);
    expect(masked).not.toHaveProperty('returnImageUrl');
    expect(masked.returnImageUrlCount).toBe(1);
    expect(masked.attendanceList).toEqual([
      { memberId: 101, status: '참가', timeStamp: '10:00' },
    ]);
  });

  it('endSession FAIL 결과는 차단 사유만 남긴다', () => {
    expect(
      maskEndSessionResultForLog({
        message: 'FAIL',
        reason: 'NOT_ALLOWED',
        endBlockedReason: 'MIN_ELAPSED_NOT_MET',
      }),
    ).toEqual({
      message: 'FAIL',
      reason: 'NOT_ALLOWED',
      endBlockedReason: 'MIN_ELAPSED_NOT_MET',
    });
  });
});
