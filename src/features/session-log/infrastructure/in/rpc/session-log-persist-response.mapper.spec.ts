import { describe, expect, it } from '@jest/globals';
import type { SessionLogPersistResult } from '../../../application/session-log-persist.result';
import type { SessionLogDetailReadModel } from '../../../domain/read-models/session-log.read-model';
import { SessionLogPersistResponseMapper } from './session-log-persist-response.mapper';

function buildDetailReadModel(): SessionLogDetailReadModel {
  return {
    sessionId: 42,
    creatorId: 1,
    creatorName: 'Creator',
    creatorNickname: 'nick',
    title: 'Practice',
    date: '2026-04-22',
    startTime: '2026-04-22T01:00:00.000Z',
    endTime: '2026-04-22T02:00:00.000Z',
    sessionType: 'RESERVED',
    reservationType: 'REGULAR',
    participationAvailable: true,
    forceEnd: false,
    attendeeCount: 1,
    extendCount: 0,
    returnImageUrl: null,
    reservationId: 10,
    attendanceList: [
      {
        member: {
          memberId: 2,
          name: 'Member',
          nickname: null,
          blogUrl: null,
          enrollmentNumber: '20260001',
          profileImageUrl: null,
          instagramUrl: null,
          role: ['MEMBER'],
        },
        status: '참가',
        timeStamp: '2026-04-22T01:30:00.000Z',
      },
    ],
    borrowInstruments: [],
  };
}

describe('SessionLogPersistResponseMapper', () => {
  it('created는 sessionLog를 RPC shape으로 변환한다', () => {
    const detail = buildDetailReadModel();
    const result: SessionLogPersistResult = {
      status: 'created',
      sessionLog: detail,
    };

    expect(SessionLogPersistResponseMapper.toRpc(result)).toEqual({
      status: 'created',
      sessionLog: {
        sessionId: 42,
        creatorId: 1,
        creatorName: 'Creator',
        creatorNickname: 'nick',
        title: 'Practice',
        date: '2026-04-22',
        startTime: '2026-04-22T01:00:00.000Z',
        endTime: '2026-04-22T02:00:00.000Z',
        sessionType: 'RESERVED',
        reservationType: 'REGULAR',
        participationAvailable: true,
        forceEnd: false,
        extendCount: 0,
        returnImageUrl: null,
        reservationId: 10,
        attendanceList: [
          {
            member: {
              memberId: 2,
              name: 'Member',
              nickname: null,
              blogUrl: null,
              enrollmentNumber: '20260001',
              profileImageUrl: null,
              instagramUrl: null,
              role: ['MEMBER'],
            },
            status: '참가',
            timeStamp: '2026-04-22T01:30:00.000Z',
          },
        ],
        borrowInstruments: [],
      },
    });
  });

  it('skipped는 RPC response를 그대로 반환한다', () => {
    const result: SessionLogPersistResult = {
      status: 'skipped',
      skipReason: 'EXTERNAL_RESERVATION',
    };

    expect(SessionLogPersistResponseMapper.toRpc(result)).toEqual(result);
  });

  it('failed는 RPC response를 그대로 반환한다', () => {
    const result: SessionLogPersistResult = {
      status: 'failed',
      errorCode: 'SESSION_LOG_PERSIST_FAILED',
    };

    expect(SessionLogPersistResponseMapper.toRpc(result)).toEqual(result);
  });
});
