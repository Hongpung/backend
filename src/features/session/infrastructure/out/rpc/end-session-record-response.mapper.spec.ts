import { EndSessionRecordResponseMapper } from './end-session-record-response.mapper';

describe('EndSessionRecordResponseMapper', () => {
  it('created 응답을 SessionLogDetailReadModel로 변환한다', () => {
    const result = EndSessionRecordResponseMapper.toPortResult({
      status: 'created',
      sessionLog: {
        sessionId: 42,
        creatorId: 1,
        creatorName: '홍길동',
        creatorNickname: null,
        title: '연습',
        date: '2030-06-15',
        startTime: '10:00',
        endTime: '11:00',
        sessionType: 'REALTIME',
        reservationType: null,
        participationAvailable: true,
        forceEnd: false,
        extendCount: 0,
        returnImageUrl: [],
        reservationId: null,
        attendanceList: [],
        borrowInstruments: [],
      },
    });

    expect(result).toEqual({
      status: 'created',
      sessionLog: expect.objectContaining({
        sessionId: 42,
        creatorName: '홍길동',
      }),
    });
  });

  it('failed·skipped는 그대로 전달한다', () => {
    expect(
      EndSessionRecordResponseMapper.toPortResult({
        status: 'failed',
        errorCode: 'SESSION_LOG_PERSIST_FAILED',
      }),
    ).toEqual({
      status: 'failed',
      errorCode: 'SESSION_LOG_PERSIST_FAILED',
    });
  });
});
