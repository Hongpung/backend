import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import {
  END_SESSION_MIN_ELAPSED_MS,
  EXTEND_SESSION_MIN_REMAINING_MS,
} from 'src/features/session/domain/session.constant';
import { RealtimeSession } from 'src/features/session/domain/entities/realtime-session.entity';
import { ReservationSession } from 'src/features/session/domain/entities/reservation-session.entity';
import type { SessionEventPublisherPort } from '../ports/out/session-event-publisher.port';
import type { SessionRuntimePort } from '../ports/out/session-runtime.port';
import type { EndSessionRecordPort } from '../ports/out/end-session-record.port';
import type { EndSessionSnapshotPort } from '../ports/out/end-session-snapshot.port';
import { SessionOperationsService } from './session-operations.service';

describe('SessionOperationsService (통합)', () => {
  const attendUserId = 101;
  const otherUserId = 202;
  const sessionId = 'ops-int-rt-1';

  const sessionUser = {
    memberId: attendUserId,
    email: 'attend@test.com',
    name: '참석자',
    club: '테스트동아리',
    enrollmentNumber: '2021001',
    role: ['LEADER'],
  };

  let sessionRuntime: jest.Mocked<SessionRuntimePort>;
  let eventPublisher: jest.Mocked<
    Pick<SessionEventPublisherPort, 'publishEndSession'>
  >;
  let endSessionRecord: jest.Mocked<EndSessionRecordPort>;
  let endSessionSnapshot: jest.Mocked<EndSessionSnapshotPort>;
  let service: SessionOperationsService;
  let onAirSession: RealtimeSession;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2030-06-15T01:30:00.000Z'));

    onAirSession = RealtimeSession.rehydrate({
      sessionId,
      date: '2030-06-15',
      title: '실시간 연습',
      startTime: '10:00',
      endTime: '12:00',
      extendCount: 0,
      creatorName: sessionUser.name,
      creatorId: attendUserId,
      participationAvailable: true,
      status: 'ONAIR',
      attendanceList: [
        {
          user: sessionUser,
          status: '참가',
          timeStamp: AppKstDateTime.parseKstDateTime('2030-06-15', '10:00'),
        },
      ],
    });

    sessionRuntime = {
      isAlreadyAttendUser: jest.fn((userId: number) => userId === attendUserId),
      getCurrentSessionStatus: jest.fn(() => onAirSession),
      isExtendAtMaxCap: jest.fn(() => false),
      getExtendMaxCapBlockedReason: jest.fn(() => null),
      extendSession: jest.fn(async () => undefined),
      clearSessionEndTimedJobs: jest.fn(async () => undefined),
      endSessionById: jest.fn(async () => onAirSession),
      forceEndSessionIfMatching: jest.fn(async () => true),
      getSessionById: jest.fn((id: string | number) =>
        String(id) === sessionId ? onAirSession : null,
      ),
      getNextReservationSession: jest.fn(() => null),
      startRealTimeSession: jest.fn(async () => undefined),
      startReservationSession: jest.fn(async () => undefined),
      attendToSession: jest.fn(async () => ({ status: '참가' as const })),
      getOnairAttendanceMemberIds: jest.fn(() => [attendUserId]),
    };

    eventPublisher = {
      publishEndSession: jest.fn(async () => undefined),
    };

    endSessionSnapshot = {
      toPersistRequest: jest.fn(() => ({
        runtimeSessionId: onAirSession.sessionId,
        date: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        creatorId: attendUserId,
        title: '실시간 연습',
        sessionType: 'REALTIME',
        reservationType: null,
        reservationId: null,
        extendCount: 0,
        participationAvailable: true,
        returnImageUrl: ['https://img/1.png'],
        forceEnd: false,
        attendanceList: [],
        borrowInstruments: [],
      })),
    };

    endSessionRecord = {
      rollback: jest.fn(async () => undefined),
      record: jest.fn(async () => ({
        status: 'created' as const,
        sessionLog: {
          sessionId: 99,
          creatorId: attendUserId,
          creatorName: sessionUser.name,
          creatorNickname: null,
          title: '실시간 연습',
          date: '2030-06-15',
          startTime: '10:00',
          endTime: '12:00',
          sessionType: 'REALTIME',
          reservationType: null,
          participationAvailable: true,
          forceEnd: false,
          extendCount: 0,
          returnImageUrl: ['https://img/1.png'],
          reservationId: null,
          attendanceList: [
            {
              member: {
                memberId: attendUserId,
                name: sessionUser.name,
                nickname: null,
                blogUrl: null,
                enrollmentNumber: sessionUser.enrollmentNumber,
                profileImageUrl: null,
                instagramUrl: null,
                club: sessionUser.club,
                role: sessionUser.role,
              },
              status: '참가',
              timeStamp: '10:00',
            },
          ],
          borrowInstruments: [],
        },
      })),
    };

    service = new SessionOperationsService(
      eventPublisher as unknown as SessionEventPublisherPort,
      sessionRuntime as unknown as SessionRuntimePort,
      endSessionRecord as unknown as EndSessionRecordPort,
      endSessionSnapshot as unknown as EndSessionSnapshotPort,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('출석 회원은 연장 조건을 만족하면 SUCCESS를 반환하고 runtime 연장을 호출한다', async () => {
    const result = await service.extendSession(attendUserId, sessionId);

    expect(result).toEqual({ message: 'SUCCESS' });
    expect(sessionRuntime.extendSession).toHaveBeenCalledTimes(1);
  });

  it('출석하지 않은 회원은 extendSession에서 UNAUTHORIZED를 반환한다', async () => {
    const result = await service.extendSession(otherUserId, sessionId);

    expect(result).toEqual({ message: 'FAIL', reason: 'UNAUTHORIZED' });
    expect(sessionRuntime.extendSession).not.toHaveBeenCalled();
  });

  it('종료까지 최소 연장 잔여 시간 미만이면 MIN_REMAINING_NOT_MET으로 연장이 거부된다', async () => {
    const endMs = AppKstDateTime.parseKstDateTime(
      onAirSession.date,
      onAirSession.endTime,
    ).getTime();
    jest.setSystemTime(new Date(endMs - EXTEND_SESSION_MIN_REMAINING_MS + 1));

    const result = await service.extendSession(attendUserId, sessionId);

    expect(result).toEqual({
      message: 'FAIL',
      reason: 'NOT_ALLOWED',
      extendBlockedReason: 'MIN_REMAINING_NOT_MET',
    });
    expect(sessionRuntime.extendSession).not.toHaveBeenCalled();
  });

  it('AFTER 세션이면 extendSession이 ALREADY_ENDED로 거부된다', async () => {
    const afterSession = RealtimeSession.rehydrate({
      sessionId,
      date: '2030-06-15',
      title: '실시간 연습',
      startTime: '10:00',
      endTime: '12:00',
      extendCount: 0,
      creatorName: sessionUser.name,
      creatorId: attendUserId,
      participationAvailable: true,
      status: 'AFTER',
      attendanceList: [
        {
          user: sessionUser,
          status: '참가',
          timeStamp: AppKstDateTime.parseKstDateTime('2030-06-15', '10:00'),
        },
      ],
    });
    sessionRuntime.getSessionById.mockImplementation((id) =>
      String(id) === sessionId ? afterSession : null,
    );

    const result = await service.extendSession(attendUserId, sessionId);

    expect(result).toEqual({
      message: 'FAIL',
      reason: 'NOT_ALLOWED',
      extendBlockedReason: 'ALREADY_ENDED',
    });
    expect(sessionRuntime.extendSession).not.toHaveBeenCalled();
  });

  it('persist → runtime end → publishEndSession 순서로 호출한다', async () => {
    const result = await service.endSession(attendUserId, sessionId, [
      'https://img/1.png',
    ]);

    expect(result).toMatchObject({
      message: 'SUCCESS',
      forceEnd: false,
      sessionLogDetail: {
        sessionId: 99,
        attendanceList: [{ status: '참가' }],
      },
    });
    expect(endSessionRecord.record).toHaveBeenCalledTimes(1);
    expect(sessionRuntime.clearSessionEndTimedJobs).toHaveBeenCalledWith(
      sessionId,
    );
    expect(sessionRuntime.endSessionById).toHaveBeenCalledWith(sessionId);
    expect(sessionRuntime.endSessionById).toHaveBeenCalledTimes(1);
    expect(eventPublisher.publishEndSession).toHaveBeenCalledTimes(1);
    const recordOrder = endSessionRecord.record.mock.invocationCallOrder[0];
    const clearJobsOrder =
      sessionRuntime.clearSessionEndTimedJobs.mock.invocationCallOrder[0];
    const endOrder = sessionRuntime.endSessionById.mock.invocationCallOrder[0];
    const publishOrder =
      eventPublisher.publishEndSession.mock.invocationCallOrder[0];
    expect(recordOrder).toBeLessThan(clearJobsOrder);
    expect(clearJobsOrder).toBeLessThan(endOrder);
    expect(endOrder).toBeLessThan(publishOrder);
  });

  it('persist 실패 시 runtime end와 publishEndSession을 호출하지 않는다', async () => {
    endSessionRecord.record.mockResolvedValue({
      status: 'failed',
      errorCode: 'SESSION_LOG_PERSIST_FAILED',
    });

    const result = await service.endSession(attendUserId, sessionId, []);

    expect(result).toEqual({
      message: 'FAIL',
      reason: 'NOT_ALLOWED',
      endBlockedReason: 'SESSION_LOG_PERSIST_FAILED',
    });
    expect(endSessionRecord.record).toHaveBeenCalledTimes(1);
    expect(endSessionRecord.rollback).not.toHaveBeenCalled();
    expect(sessionRuntime.clearSessionEndTimedJobs).not.toHaveBeenCalled();
    expect(sessionRuntime.endSessionById).not.toHaveBeenCalled();
    expect(eventPublisher.publishEndSession).not.toHaveBeenCalled();
  });

  it('persist RPC timeout 시 rollback(runtimeSessionId) 1회 후 SESSION_LOG_RPC_TIMEOUT으로 종료가 거부된다', async () => {
    const runtimeSessionIdForRollback = 'runtime-rollback-key-xyz';
    endSessionSnapshot.toPersistRequest.mockReturnValue({
      runtimeSessionId: runtimeSessionIdForRollback,
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      creatorId: attendUserId,
      title: '실시간 연습',
      sessionType: 'REALTIME',
      reservationType: null,
      reservationId: null,
      extendCount: 0,
      participationAvailable: true,
      returnImageUrl: ['https://img/1.png'],
      forceEnd: false,
      attendanceList: [],
      borrowInstruments: [],
    });
    endSessionRecord.record.mockResolvedValue({
      status: 'failed',
      errorCode: 'SESSION_LOG_RPC_TIMEOUT',
    });

    const result = await service.endSession(attendUserId, sessionId, [
      'https://img/1.png',
    ]);

    expect(result).toEqual({
      message: 'FAIL',
      reason: 'NOT_ALLOWED',
      endBlockedReason: 'SESSION_LOG_RPC_TIMEOUT',
    });
    expect(endSessionRecord.record).toHaveBeenCalledTimes(1);
    expect(endSessionRecord.rollback).toHaveBeenCalledTimes(1);
    expect(endSessionRecord.rollback).toHaveBeenCalledWith(
      runtimeSessionIdForRollback,
    );
    expect(sessionRuntime.endSessionById).not.toHaveBeenCalled();
    expect(eventPublisher.publishEndSession).not.toHaveBeenCalled();
    const recordOrder = endSessionRecord.record.mock.invocationCallOrder[0];
    const rollbackOrder = endSessionRecord.rollback.mock.invocationCallOrder[0];
    expect(recordOrder).toBeLessThan(rollbackOrder);
  });

  it('persist 성공 후 runtime end 실패 시 RUNTIME_END_FAILED를 반환한다', async () => {
    sessionRuntime.endSessionById.mockResolvedValue(undefined);
    sessionRuntime.getSessionById.mockImplementation((id) =>
      String(id) === sessionId ? onAirSession : null,
    );

    const resultPromise = service.endSession(attendUserId, sessionId, []);
    await jest.advanceTimersByTimeAsync(500);
    const result = await resultPromise;

    expect(result).toEqual({
      message: 'FAIL',
      reason: 'NOT_ALLOWED',
      endBlockedReason: 'RUNTIME_END_FAILED',
    });
    expect(endSessionRecord.record).toHaveBeenCalledTimes(1);
    expect(endSessionRecord.rollback).not.toHaveBeenCalled();
    expect(sessionRuntime.clearSessionEndTimedJobs).toHaveBeenCalledWith(
      sessionId,
    );
    expect(sessionRuntime.endSessionById).toHaveBeenCalled();
    expect(eventPublisher.publishEndSession).not.toHaveBeenCalled();
  });

  it('AFTER 세션이면 endSession이 ALREADY_ENDED로 거부된다', async () => {
    const afterSession = RealtimeSession.rehydrate({
      sessionId,
      date: '2030-06-15',
      title: '실시간 연습',
      startTime: '10:00',
      endTime: '12:00',
      extendCount: 0,
      creatorName: sessionUser.name,
      creatorId: attendUserId,
      participationAvailable: true,
      status: 'AFTER',
      attendanceList: [
        {
          user: sessionUser,
          status: '참가',
          timeStamp: AppKstDateTime.parseKstDateTime('2030-06-15', '10:00'),
        },
      ],
    });
    sessionRuntime.getSessionById.mockImplementation((id) =>
      String(id) === sessionId ? afterSession : null,
    );
    sessionRuntime.getCurrentSessionStatus.mockReturnValue(null);

    const result = await service.endSession(attendUserId, sessionId, []);

    expect(result).toEqual({
      message: 'FAIL',
      reason: 'NOT_ALLOWED',
      endBlockedReason: 'ALREADY_ENDED',
    });
    expect(endSessionRecord.record).not.toHaveBeenCalled();
    expect(sessionRuntime.endSessionById).not.toHaveBeenCalled();
  });

  it('시작 후 최소 종료 대기 시간 미만이면 endSession이 MIN_ELAPSED_NOT_MET으로 거부된다', async () => {
    const startMs = AppKstDateTime.parseKstDateTime(
      onAirSession.date,
      onAirSession.startTime,
    ).getTime();
    jest.setSystemTime(new Date(startMs + END_SESSION_MIN_ELAPSED_MS - 1));

    const result = await service.endSession(attendUserId, sessionId, []);

    expect(result).toEqual({
      message: 'FAIL',
      reason: 'NOT_ALLOWED',
      endBlockedReason: 'MIN_ELAPSED_NOT_MET',
    });
    expect(endSessionRecord.record).not.toHaveBeenCalled();
    expect(sessionRuntime.endSessionById).not.toHaveBeenCalled();
    expect(eventPublisher.publishEndSession).not.toHaveBeenCalled();
  });

  it('handleForceEndSession: on-air 없으면 skipped를 반환한다', async () => {
    sessionRuntime.getSessionById.mockReturnValue(null);

    const result = await service.handleForceEndSession({ sessionId });

    expect(result).toEqual({
      status: 'skipped',
      skipReason: 'NO_ON_AIR_SESSION',
    });
    expect(endSessionRecord.record).not.toHaveBeenCalled();
  });

  it('handleForceEndSession: persist → runtime → publish 순서로 success를 반환한다', async () => {
    const result = await service.handleForceEndSession({ sessionId });

    expect(result).toEqual({ status: 'success', sessionLogId: 99 });
    expect(endSessionRecord.record).toHaveBeenCalledTimes(1);
    expect(sessionRuntime.clearSessionEndTimedJobs).toHaveBeenCalledWith(
      sessionId,
    );
    expect(sessionRuntime.forceEndSessionIfMatching).toHaveBeenCalledWith(
      sessionId,
    );
    expect(eventPublisher.publishEndSession).toHaveBeenCalledTimes(1);
    const recordOrder = endSessionRecord.record.mock.invocationCallOrder[0];
    const clearJobsOrder =
      sessionRuntime.clearSessionEndTimedJobs.mock.invocationCallOrder[0];
    const runtimeOrder =
      sessionRuntime.forceEndSessionIfMatching.mock.invocationCallOrder[0];
    const publishOrder =
      eventPublisher.publishEndSession.mock.invocationCallOrder[0];
    expect(recordOrder).toBeLessThan(clearJobsOrder);
    expect(clearJobsOrder).toBeLessThan(runtimeOrder);
    expect(runtimeOrder).toBeLessThan(publishOrder);
  });

  it('handleForceEndSession: persist 실패 시 runtime end를 호출하지 않는다', async () => {
    endSessionRecord.record.mockResolvedValue({
      status: 'failed',
      errorCode: 'SESSION_LOG_PERSIST_FAILED',
    });

    const result = await service.handleForceEndSession({ sessionId });

    expect(result).toEqual({
      status: 'failed',
      errorCode: 'SESSION_LOG_PERSIST_FAILED',
    });
    expect(sessionRuntime.forceEndSessionIfMatching).not.toHaveBeenCalled();
    expect(eventPublisher.publishEndSession).not.toHaveBeenCalled();
  });

  it('handleForceEndSession: persist RPC timeout 시 rollback 1회 후 failed(SESSION_LOG_RPC_TIMEOUT)를 반환한다', async () => {
    const runtimeSessionIdForRollback = 'runtime-rollback-key-xyz';
    endSessionSnapshot.toPersistRequest.mockReturnValue({
      runtimeSessionId: runtimeSessionIdForRollback,
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      creatorId: attendUserId,
      title: '실시간 연습',
      sessionType: 'REALTIME',
      reservationType: null,
      reservationId: null,
      extendCount: 0,
      participationAvailable: true,
      returnImageUrl: null,
      forceEnd: true,
      attendanceList: [],
      borrowInstruments: [],
    });
    endSessionRecord.record.mockResolvedValue({
      status: 'failed',
      errorCode: 'SESSION_LOG_RPC_TIMEOUT',
    });

    const result = await service.handleForceEndSession({ sessionId });

    expect(result).toEqual({
      status: 'failed',
      errorCode: 'SESSION_LOG_RPC_TIMEOUT',
    });
    expect(endSessionRecord.record).toHaveBeenCalledTimes(1);
    expect(endSessionRecord.rollback).toHaveBeenCalledTimes(1);
    expect(endSessionRecord.rollback).toHaveBeenCalledWith(
      runtimeSessionIdForRollback,
    );
    expect(sessionRuntime.forceEndSessionIfMatching).not.toHaveBeenCalled();
    expect(eventPublisher.publishEndSession).not.toHaveBeenCalled();
  });

  it('handleForceEndSession: AFTER 세션이면 ALREADY_ENDED로 skipped한다', async () => {
    const afterSession = RealtimeSession.rehydrate({
      sessionId,
      date: '2030-06-15',
      title: '실시간 연습',
      startTime: '10:00',
      endTime: '12:00',
      extendCount: 0,
      creatorName: sessionUser.name,
      creatorId: attendUserId,
      participationAvailable: true,
      status: 'AFTER',
      attendanceList: [
        {
          user: sessionUser,
          status: '참가',
          timeStamp: AppKstDateTime.parseKstDateTime('2030-06-15', '10:00'),
        },
      ],
    });
    sessionRuntime.getSessionById.mockImplementation((id) =>
      String(id) === sessionId ? afterSession : null,
    );

    const result = await service.handleForceEndSession({ sessionId });

    expect(result).toEqual({
      status: 'skipped',
      skipReason: 'ALREADY_ENDED',
    });
    expect(endSessionRecord.record).not.toHaveBeenCalled();
  });

  describe('S-I03 extendSession 반환 계약', () => {
    it('세션이 없으면 NOT_FOUND와 NO_CURRENT_SESSION을 반환한다', async () => {
      sessionRuntime.getSessionById.mockReturnValue(null);

      const result = await service.extendSession(attendUserId, sessionId);

      expect(result).toEqual({
        message: 'FAIL',
        reason: 'NOT_FOUND',
        extendBlockedReason: 'NO_CURRENT_SESSION',
      });
      expect(sessionRuntime.extendSession).not.toHaveBeenCalled();
    });

    it('ONAIR가 아닌 BEFORE 세션이면 NOT_FOUND와 NO_CURRENT_SESSION을 반환한다', async () => {
      const beforeSession = ReservationSession.rehydrate({
        sessionId,
        reservationId: 12,
        reservationType: 'REGULAR',
        date: '2030-06-15',
        title: '예약 연습',
        startTime: '10:00',
        endTime: '12:00',
        extendCount: 0,
        creatorId: attendUserId,
        creatorName: sessionUser.name,
        participationAvailable: true,
        status: 'BEFORE',
        participators: [],
        participatorIds: [],
        borrowInstruments: [],
        attendanceList: [
          {
            user: sessionUser,
            status: '출석',
            timeStamp: AppKstDateTime.parseKstDateTime('2030-06-15', '10:00'),
          },
        ],
      });
      sessionRuntime.getSessionById.mockImplementation((id) =>
        String(id) === sessionId ? beforeSession : null,
      );

      const result = await service.extendSession(attendUserId, sessionId);

      expect(result).toEqual({
        message: 'FAIL',
        reason: 'NOT_FOUND',
        extendBlockedReason: 'NO_CURRENT_SESSION',
      });
      expect(sessionRuntime.extendSession).not.toHaveBeenCalled();
    });

    it('현재 on-air 세션 ID가 다르면 SESSION_ID_MISMATCH로 연장이 거부된다', async () => {
      const otherOnAirSession = RealtimeSession.rehydrate({
        sessionId: 'ops-int-rt-other',
        date: '2030-06-15',
        title: '다른 실시간 연습',
        startTime: '10:00',
        endTime: '12:00',
        extendCount: 0,
        creatorName: sessionUser.name,
        creatorId: attendUserId,
        participationAvailable: true,
        status: 'ONAIR',
        attendanceList: [
          {
            user: sessionUser,
            status: '참가',
            timeStamp: AppKstDateTime.parseKstDateTime('2030-06-15', '10:00'),
          },
        ],
      });
      sessionRuntime.getSessionById.mockImplementation((id) =>
        String(id) === sessionId ? onAirSession : null,
      );
      sessionRuntime.getCurrentSessionStatus.mockReturnValue(otherOnAirSession);

      const result = await service.extendSession(attendUserId, sessionId);

      expect(result).toEqual({
        message: 'FAIL',
        reason: 'NOT_ALLOWED',
        extendBlockedReason: 'SESSION_ID_MISMATCH',
      });
      expect(sessionRuntime.extendSession).not.toHaveBeenCalled();
    });

    it('연장 상한에 도달하면 차단 사유와 함께 연장이 거부된다', async () => {
      sessionRuntime.getExtendMaxCapBlockedReason.mockReturnValue(
        'NEXT_RESERVATION_CONFLICT',
      );

      const result = await service.extendSession(attendUserId, sessionId);

      expect(result).toEqual({
        message: 'FAIL',
        reason: 'NOT_ALLOWED',
        extendBlockedReason: 'NEXT_RESERVATION_CONFLICT',
      });
      expect(sessionRuntime.extendSession).not.toHaveBeenCalled();
    });
  });

  describe('S-I04 endSession 반환 계약', () => {
    it('세션이 없으면 NOT_FOUND와 NO_CURRENT_SESSION을 반환한다', async () => {
      sessionRuntime.getSessionById.mockReturnValue(null);

      const result = await service.endSession(attendUserId, sessionId, []);

      expect(result).toEqual({
        message: 'FAIL',
        reason: 'NOT_FOUND',
        endBlockedReason: 'NO_CURRENT_SESSION',
      });
      expect(endSessionRecord.record).not.toHaveBeenCalled();
      expect(sessionRuntime.endSessionById).not.toHaveBeenCalled();
      expect(eventPublisher.publishEndSession).not.toHaveBeenCalled();
    });

    it('ONAIR가 아닌 BEFORE 세션이면 NOT_FOUND와 NO_CURRENT_SESSION을 반환한다', async () => {
      const beforeSession = ReservationSession.rehydrate({
        sessionId,
        reservationId: 12,
        reservationType: 'REGULAR',
        date: '2030-06-15',
        title: '예약 연습',
        startTime: '10:00',
        endTime: '12:00',
        extendCount: 0,
        creatorId: attendUserId,
        creatorName: sessionUser.name,
        participationAvailable: true,
        status: 'BEFORE',
        participators: [],
        participatorIds: [],
        borrowInstruments: [],
        attendanceList: [
          {
            user: sessionUser,
            status: '출석',
            timeStamp: AppKstDateTime.parseKstDateTime('2030-06-15', '10:00'),
          },
        ],
      });
      sessionRuntime.getSessionById.mockImplementation((id) =>
        String(id) === sessionId ? beforeSession : null,
      );

      const result = await service.endSession(attendUserId, sessionId, []);

      expect(result).toEqual({
        message: 'FAIL',
        reason: 'NOT_FOUND',
        endBlockedReason: 'NO_CURRENT_SESSION',
      });
      expect(endSessionRecord.record).not.toHaveBeenCalled();
      expect(sessionRuntime.endSessionById).not.toHaveBeenCalled();
      expect(eventPublisher.publishEndSession).not.toHaveBeenCalled();
    });

    it('현재 on-air 세션 ID가 다르면 SESSION_ID_MISMATCH로 종료가 거부된다', async () => {
      const otherOnAirSession = RealtimeSession.rehydrate({
        sessionId: 'ops-int-rt-other',
        date: '2030-06-15',
        title: '다른 실시간 연습',
        startTime: '10:00',
        endTime: '12:00',
        extendCount: 0,
        creatorName: sessionUser.name,
        creatorId: attendUserId,
        participationAvailable: true,
        status: 'ONAIR',
        attendanceList: [
          {
            user: sessionUser,
            status: '참가',
            timeStamp: AppKstDateTime.parseKstDateTime('2030-06-15', '10:00'),
          },
        ],
      });
      sessionRuntime.getSessionById.mockImplementation((id) =>
        String(id) === sessionId ? onAirSession : null,
      );
      sessionRuntime.getCurrentSessionStatus.mockReturnValue(otherOnAirSession);

      const result = await service.endSession(attendUserId, sessionId, []);

      expect(result).toEqual({
        message: 'FAIL',
        reason: 'NOT_ALLOWED',
        endBlockedReason: 'SESSION_ID_MISMATCH',
      });
      expect(endSessionRecord.record).not.toHaveBeenCalled();
      expect(sessionRuntime.endSessionById).not.toHaveBeenCalled();
      expect(eventPublisher.publishEndSession).not.toHaveBeenCalled();
    });
  });

  describe('S-I05 handleForceEndSession 반환 계약', () => {
    it('현재 on-air 세션 ID가 다르면 SESSION_ID_MISMATCH로 skipped한다', async () => {
      const otherOnAirSession = RealtimeSession.rehydrate({
        sessionId: 'ops-int-rt-other',
        date: '2030-06-15',
        title: '다른 실시간 연습',
        startTime: '10:00',
        endTime: '12:00',
        extendCount: 0,
        creatorName: sessionUser.name,
        creatorId: attendUserId,
        participationAvailable: true,
        status: 'ONAIR',
        attendanceList: [
          {
            user: sessionUser,
            status: '참가',
            timeStamp: AppKstDateTime.parseKstDateTime('2030-06-15', '10:00'),
          },
        ],
      });
      sessionRuntime.getSessionById.mockImplementation((id) =>
        String(id) === sessionId ? onAirSession : null,
      );
      sessionRuntime.getCurrentSessionStatus.mockReturnValue(otherOnAirSession);

      const result = await service.handleForceEndSession({ sessionId });

      expect(result).toEqual({
        status: 'skipped',
        skipReason: 'SESSION_ID_MISMATCH',
      });
      expect(endSessionRecord.record).not.toHaveBeenCalled();
      expect(sessionRuntime.forceEndSessionIfMatching).not.toHaveBeenCalled();
      expect(eventPublisher.publishEndSession).not.toHaveBeenCalled();
    });
  });

  describe('S-I06 runtime end 실패 보호', () => {
    it('persist 성공 후 forceEnd runtime 실패 시 RUNTIME_END_FAILED를 반환하고 rollback·publish를 호출하지 않는다', async () => {
      sessionRuntime.forceEndSessionIfMatching.mockResolvedValue(false);
      sessionRuntime.getSessionById.mockImplementation((id) =>
        String(id) === sessionId ? onAirSession : null,
      );

      const resultPromise = service.handleForceEndSession({ sessionId });
      await jest.advanceTimersByTimeAsync(500);
      const result = await resultPromise;

      expect(result).toEqual({
        status: 'failed',
        errorCode: 'RUNTIME_END_FAILED',
      });
      expect(endSessionRecord.record).toHaveBeenCalledTimes(1);
      expect(endSessionRecord.rollback).not.toHaveBeenCalled();
      expect(sessionRuntime.forceEndSessionIfMatching).toHaveBeenCalled();
      expect(eventPublisher.publishEndSession).not.toHaveBeenCalled();
    });
  });
});
