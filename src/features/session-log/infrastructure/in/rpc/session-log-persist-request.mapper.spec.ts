import { describe, expect, it } from '@jest/globals';
import type { SessionLogPersistRpcRequest } from 'src/contracts/rpc/session-log-persist.rpc';
import { SessionLogPersistRequestMapper } from './session-log-persist-request.mapper';

function buildRpcRequest(): SessionLogPersistRpcRequest {
  return {
    runtimeSessionId: 'rt-mapper-1',
    date: new Date('2026-04-22T00:00:00.000Z'),
    startTime: new Date('2026-04-22T01:00:00.000Z'),
    endTime: new Date('2026-04-22T02:00:00.000Z'),
    creatorId: 1,
    title: 'Practice',
    sessionType: 'RESERVED',
    reservationType: 'REGULAR',
    reservationId: 10,
    extendCount: 0,
    participationAvailable: true,
    returnImageUrl: null,
    forceEnd: false,
    attendanceList: [
      {
        memberId: 2,
        status: '참가',
        timeStamp: new Date('2026-04-22T01:30:00.000Z'),
      },
    ],
    borrowInstruments: [],
  };
}

describe('SessionLogPersistRequestMapper', () => {
  it('RPC request를 application command로 변환한다', () => {
    const request = buildRpcRequest();

    expect(SessionLogPersistRequestMapper.toCommand(request)).toEqual(request);
  });
});
