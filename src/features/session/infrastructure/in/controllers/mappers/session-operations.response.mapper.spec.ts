import { describe, expect, it } from '@jest/globals';
import { SESSION_OPERATION_REASON_MESSAGES_KO } from '../../../../domain/session-operation-reason.messages';
import { SessionOperationsResponseMapper } from './session-operations.response.mapper';

describe('SessionOperationsResponseMapper', () => {
  it('체크인 결과를 성공 코드와 함께 매핑한다', () => {
    const result = SessionOperationsResponseMapper.toIsCheckinResDto({
      isCheckin: true,
    });

    expect(result).toEqual({
      isCheckin: true,
      code: 2000,
    });
  });

  it('연장 실패 사유를 실패 코드로 매핑한다', () => {
    const result = SessionOperationsResponseMapper.toExtendSessionResDto({
      message: 'FAIL',
      reason: 'UNAUTHORIZED',
    });

    expect(result).toEqual({
      message: 'FAIL',
      code: 4002,
      reason: SESSION_OPERATION_REASON_MESSAGES_KO.UNAUTHORIZED,
    });
  });

  it('extend 실패 시 차단 사유를 한글 reason으로 내려준다', () => {
    const result = SessionOperationsResponseMapper.toExtendSessionResDto({
      message: 'FAIL',
      reason: 'NOT_ALLOWED',
      extendBlockedReason: 'NEXT_RESERVATION_CONFLICT',
    });

    expect(result).toMatchObject({
      message: 'FAIL',
      code: 4003,
      reason: SESSION_OPERATION_REASON_MESSAGES_KO.NEXT_RESERVATION_CONFLICT,
    });
  });

  it('RPC sessionLogDetail이 있으면 그대로 endSessionData로 내려준다', () => {
    const sessionLogDetail = {
      sessionId: 42,
      creatorId: 7,
      creatorName: 'Hong',
      creatorNickname: 'hp',
      title: 'Practice Session',
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      sessionType: 'REALTIME',
      reservationType: null,
      participationAvailable: true,
      forceEnd: false,
      extendCount: 1,
      returnImageUrl: ['https://cdn.test/image.png'],
      reservationId: null,
      attendanceList: [
        {
          member: {
            memberId: 7,
            name: 'Hong',
            nickname: 'hp',
            blogUrl: null,
            enrollmentNumber: '1',
            profileImageUrl: null,
            instagramUrl: null,
            role: [],
          },
          status: '참가',
          timeStamp: '09:00',
        },
      ],
      borrowInstruments: [],
    };

    const result = SessionOperationsResponseMapper.toEndSessionResDto({
      message: 'SUCCESS',
      returnImageUrls: ['https://cdn.test/image.png'],
      forceEnd: false,
      endedSession: { sessionId: 'runtime-id' } as never,
      sessionLogDetail,
    });

    expect(result).toMatchObject({
      message: 'SUCCESS',
      code: 2002,
      endSessionData: sessionLogDetail,
    });
  });
});
