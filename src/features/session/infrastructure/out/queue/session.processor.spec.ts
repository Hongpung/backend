import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Job } from 'bullmq';
import type { SessionDailyReservationSyncPayload } from '../../../domain/read-models/session-daily-reservation-sync.read-model';
import type {
  ReservationSessionWirePayload,
  SessionWirePayload,
} from 'src/features/session/infrastructure/session-wire-payload.type';
import type { ForceEndSessionResultVo } from '../../../domain/value-objects/force-end-session-result.vo';
import { SessionProcessor } from './session.processor';
import { SESSION_JOB_TYPE } from './session-job.interface';

describe('SessionProcessor', () => {
  let sessionOperations: {
    handleForceEndSession: jest.Mock<
      () => Promise<ForceEndSessionResultVo>
    >;
  };
  let sessionRuntimeManager: {
    startExternalReservationSession: jest.Mock;
    applyNoShowDiscardReservation: jest.Mock;
  };
  let sessionEventPublisher: { publishSessionUpdate: jest.Mock };
  let sessionMessaging: {
    notifyForceEnd: jest.Mock;
    notifyForceEndAlarm: jest.Mock;
    notifyNoShowDiscard: jest.Mock;
  };
  let sessionDailyReservationsSync: {
    syncDailyReservations: jest.Mock;
  };
  let sessionReservationRemind: {
    sendUpcomingScheduleNotification: jest.Mock;
  };
  let processor: SessionProcessor;

  beforeEach(() => {
    sessionOperations = {
      handleForceEndSession: jest.fn(async () => ({
        status: 'success' as const,
        sessionLogId: 42,
      })),
    };
    sessionRuntimeManager = {
      startExternalReservationSession: jest.fn(async () => undefined),
      applyNoShowDiscardReservation: jest.fn(async () => undefined),
    };
    sessionEventPublisher = {
      publishSessionUpdate: jest.fn(),
    };
    sessionMessaging = {
      notifyForceEnd: jest.fn(async () => undefined),
      notifyForceEndAlarm: jest.fn(async () => undefined),
      notifyNoShowDiscard: jest.fn(async () => undefined),
    };
    sessionDailyReservationsSync = {
      syncDailyReservations: jest.fn(async () => undefined),
    };
    sessionReservationRemind = {
      sendUpcomingScheduleNotification: jest.fn(async () => undefined),
    };
    processor = new SessionProcessor(
      sessionOperations as any,
      sessionRuntimeManager as any,
      sessionEventPublisher as any,
      sessionMessaging as any,
      sessionDailyReservationsSync as any,
      sessionReservationRemind as any,
    );
  });

  it('FORCE_END_SESSION: skipped면 job은 성공하고 푸시하지 않는다', async () => {
    sessionOperations.handleForceEndSession.mockResolvedValue({
      status: 'skipped',
      skipReason: 'NO_ON_AIR_SESSION',
    });

    const job = {
      name: SESSION_JOB_TYPE.FORCE_END_SESSION,
      data: {
        sessionId: 'sid-skip',
        sessionType: 'REALTIME',
        date: '2026-06-01',
        title: 't',
        startTime: '10:00',
        endTime: '11:00',
        extendCount: 0,
        creatorName: 'c',
        creatorId: 1,
        participationAvailable: true,
        status: 'ONAIR',
        attendanceList: [],
      },
    } as Job<
      SessionWirePayload,
      unknown,
      typeof SESSION_JOB_TYPE.FORCE_END_SESSION
    >;

    await expect(processor.process(job)).resolves.toBeUndefined();
    expect(sessionMessaging.notifyForceEnd).not.toHaveBeenCalled();
  });

  it('FORCE_END_SESSION: handleForceEndSession 후 sessionLogId로 푸시한다', async () => {
    const data: SessionWirePayload = {
      sessionId: 'sid-ff',
      sessionType: 'REALTIME',
      date: '2026-06-01',
      title: 't',
      startTime: '10:00',
      endTime: '11:00',
      extendCount: 0,
      creatorName: 'c',
      creatorId: 1,
      participationAvailable: true,
      status: 'ONAIR',
      attendanceList: [
        {
          user: {
            memberId: 9,
            email: 'e',
            name: 'n',
            club: 'cl',
            enrollmentNumber: '1',
            role: [],
          },
          status: '참가',
          timeStamp: new Date(),
        },
      ],
    };

    const job = {
      name: SESSION_JOB_TYPE.FORCE_END_SESSION,
      data,
    } as Job<
      SessionWirePayload,
      unknown,
      typeof SESSION_JOB_TYPE.FORCE_END_SESSION
    >;

    await processor.process(job);

    expect(sessionOperations.handleForceEndSession).toHaveBeenCalledWith({
      sessionId: 'sid-ff',
    });
    expect(sessionMessaging.notifyForceEnd).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'sid-ff' }),
      42,
    );
    const forceEndOrder =
      sessionOperations.handleForceEndSession.mock.invocationCallOrder[0];
    const pushOrder = sessionMessaging.notifyForceEnd.mock.invocationCallOrder[0];
    expect(forceEndOrder).toBeLessThan(pushOrder);
  });

  it('START_EXTERNAL_RESERVATION: runtime manager를 직접 호출한다', async () => {
    const data: ReservationSessionWirePayload = {
      reservationId: 77,
      reservationType: 'EXTERNAL',
      sessionId: 'ext-1',
      date: '2026-06-01',
      sessionType: 'RESERVED',
      title: '외부',
      startTime: '14:00',
      endTime: '15:00',
      extendCount: 0,
      creatorName: '외부',
      participationAvailable: false,
      status: 'BEFORE',
      participators: [],
      participatorIds: [],
      borrowInstruments: [],
      attendanceList: [],
    };

    const job = {
      name: SESSION_JOB_TYPE.START_EXTERNAL_RESERVATION,
      data,
    } as Job<
      ReservationSessionWirePayload,
      unknown,
      typeof SESSION_JOB_TYPE.START_EXTERNAL_RESERVATION
    >;

    await processor.process(job);

    expect(sessionRuntimeManager.startExternalReservationSession).toHaveBeenCalledWith(
      { sessionId: 'ext-1', reservationId: 77 },
    );
  });

  it('SESSION_END_AVAILABLE job은 publishSessionUpdate를 호출한다', async () => {
    const data: SessionWirePayload = {
      sessionId: 'sid-boundary',
      sessionType: 'REALTIME',
      date: '2026-06-01',
      title: 't',
      startTime: '10:00',
      endTime: '11:00',
      extendCount: 0,
      creatorName: 'c',
      creatorId: 1,
      participationAvailable: true,
      status: 'ONAIR',
      attendanceList: [],
    };

    const job = {
      name: SESSION_JOB_TYPE.SESSION_END_AVAILABLE,
      data,
    } as Job<
      SessionWirePayload,
      unknown,
      typeof SESSION_JOB_TYPE.SESSION_END_AVAILABLE
    >;

    await processor.process(job);

    expect(sessionEventPublisher.publishSessionUpdate).toHaveBeenCalled();
  });

  it('FORCE_END_ALARM은 SessionMessagingService를 호출한다', async () => {
    const data: SessionWirePayload = {
      sessionId: 'sid-alarm',
      sessionType: 'REALTIME',
      date: '2026-06-01',
      title: '연습',
      startTime: '10:00',
      endTime: '11:00',
      extendCount: 0,
      creatorName: 'c',
      creatorId: 1,
      participationAvailable: true,
      status: 'ONAIR',
      attendanceList: [],
    };

    const job = {
      name: SESSION_JOB_TYPE.FORCE_END_ALARM,
      data,
    } as Job<
      SessionWirePayload,
      unknown,
      typeof SESSION_JOB_TYPE.FORCE_END_ALARM
    >;

    await processor.process(job);

    expect(sessionMessaging.notifyForceEndAlarm).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'sid-alarm' }),
    );
  });

  it('SYNC_DAILY_RESERVATIONS: sync service를 호출한다', async () => {
    const data: SessionDailyReservationSyncPayload = [
      {
        reservationId: 1,
        reservationType: 'REGULAR',
        date: '2026-06-15',
        startTime: '10:00:00',
        endTime: '11:00:00',
        title: '연습',
        participationAvailable: true,
        creatorName: 'c',
      },
    ];

    const job = {
      name: SESSION_JOB_TYPE.SYNC_DAILY_RESERVATIONS,
      data,
    } as Job<
      SessionDailyReservationSyncPayload,
      unknown,
      typeof SESSION_JOB_TYPE.SYNC_DAILY_RESERVATIONS
    >;

    await processor.process(job);

    expect(sessionDailyReservationsSync.syncDailyReservations).toHaveBeenCalledWith(
      job.data,
    );
  });

  it('NO_SHOW_DISCARD_RESERVATION: runtime 폐기 후 푸시를 보낸다', async () => {
    const data: ReservationSessionWirePayload = {
      reservationId: 88,
      reservationType: 'REGULAR',
      sessionId: 'ns-1',
      date: '2026-06-01',
      sessionType: 'RESERVED',
      title: '예약',
      startTime: '14:00',
      endTime: '15:00',
      extendCount: 0,
      creatorName: 'c',
      creatorId: 1,
      participationAvailable: true,
      status: 'BEFORE',
      participators: [],
      participatorIds: [],
      borrowInstruments: [],
      attendanceList: [
        {
          user: {
            memberId: 2,
            email: 'e',
            name: 'n',
            club: 'cl',
            enrollmentNumber: '1',
            role: [],
          },
          status: '결석',
          timeStamp: new Date(),
        },
      ],
    };

    const job = {
      name: SESSION_JOB_TYPE.NO_SHOW_DISCARD_RESERVATION,
      data,
    } as Job<
      ReservationSessionWirePayload,
      unknown,
      typeof SESSION_JOB_TYPE.NO_SHOW_DISCARD_RESERVATION
    >;

    await processor.process(job);

    expect(sessionRuntimeManager.applyNoShowDiscardReservation).toHaveBeenCalledWith(
      { reservationId: 88, sessionId: 'ns-1' },
    );
    expect(sessionMessaging.notifyNoShowDiscard).toHaveBeenCalled();
    const discardOrder =
      sessionRuntimeManager.applyNoShowDiscardReservation.mock
        .invocationCallOrder[0];
    const pushOrder = sessionMessaging.notifyNoShowDiscard.mock.invocationCallOrder[0];
    expect(discardOrder).toBeLessThan(pushOrder);
  });
});
