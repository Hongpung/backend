import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { SessionRuntimeManager } from './session-runtime.manager';
import { SessionDomainService } from 'src/features/session/domain/runtime/session-domain.service';
import type { ReservationSessionProps } from 'src/features/session/domain/entities/reservation-session.entity';
import type { RealtimeSessionProps } from 'src/features/session/domain/entities/realtime-session.entity';

describe('SessionRuntimeManager (통합)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    /** KST 2026-06-15 06:00 */
    jest.setSystemTime(new Date('2026-06-14T21:00:00.000Z'));
  });

  function createManager() {
    const snapshotStore = {
      load: jest.fn(async () => null),
      save: jest.fn(async () => undefined),
      clear: jest.fn(async () => undefined),
    };

    const jobPort = {
      addForceEndJob: jest.fn(async () => undefined),
      addForceEndAlarmJob: jest.fn(async () => undefined),
      addSessionEndAvailableJob: jest.fn(async () => undefined),
      addSessionExtendUnavailableJob: jest.fn(async () => undefined),
      removeSessionEndAvailableJob: jest.fn(async () => undefined),
      removeSessionExtendUnavailableJob: jest.fn(async () => undefined),
      rescheduleSessionExtendUnavailableJob: jest.fn(async () => undefined),
      addNoShowDiscardJob: jest.fn(async () => undefined),
      removeNoShowDiscardJob: jest.fn(async () => undefined),
      addStartExternalReservationJob: jest.fn(async () => undefined),
      removeStartExternalReservationJob: jest.fn(async () => undefined),
      removeForceEndJob: jest.fn(async () => undefined),
      removeForceEndAlarmJob: jest.fn(async () => undefined),
      rescheduleForceEndJob: jest.fn(async () => undefined),
    };

    const eventPublisher = {
      publishSessionListChanged: jest.fn(),
      publishStartReservationSession: jest.fn(),
      publishStartRealtimeSession: jest.fn(),
      publishAttendSession: jest.fn(),
      publishExtendSession: jest.fn(),
      publishServerDownDiscardReservation: jest.fn(),
      publishSessionListChangedAsync: jest.fn(async () => undefined),
    };

    const discardedReservationWrite = {
      saveNoShowByReservationId: jest.fn(async () => undefined),
    };

    const manager = new SessionRuntimeManager(
      snapshotStore as never,
      jobPort as never,
      new SessionDomainService(),
      eventPublisher as never,
      discardedReservationWrite as never,
    );

    return { manager, jobPort, eventPublisher, snapshotStore };
  }

  it('INTERNAL 예약 추가 시 목록만 반영하고 타이머 job은 스케줄러가 등록한다', async () => {
    const { manager, jobPort, eventPublisher } = createManager();

    const regular: ReservationSessionProps = {
      reservationId: 701,
      reservationType: 'REGULAR',
      date: '2026-06-15',
      startTime: '10:00',
      endTime: '11:00',
      title: '정기 연습',
      participationAvailable: true,
      creatorName: '생성자',
      status: 'BEFORE',
      attendanceList: [],
    };

    await manager.addReservationSessions([regular]);

    expect(jobPort.addNoShowDiscardJob).not.toHaveBeenCalled();
    expect(jobPort.addStartExternalReservationJob).not.toHaveBeenCalled();
    expect(eventPublisher.publishSessionListChanged).toHaveBeenCalled();
  });

  it('실시간 세션 시작 시 forceEnd·alarm job과 startRealtime 이벤트를 발행한다', async () => {
    const { manager, jobPort, eventPublisher } = createManager();

    const props: RealtimeSessionProps = {
      participationAvailable: true,
      attendanceList: [],
      creatorName: '실시간생성자',
      creatorId: 301,
    };

    await manager.startRealTimeSession(props);

    expect(jobPort.addForceEndJob).toHaveBeenCalled();
    expect(jobPort.addForceEndAlarmJob).toHaveBeenCalled();
    expect(jobPort.addSessionEndAvailableJob).toHaveBeenCalled();
    expect(jobPort.addSessionExtendUnavailableJob).toHaveBeenCalled();
    expect(eventPublisher.publishStartRealtimeSession).toHaveBeenCalled();
    expect(eventPublisher.publishSessionListChanged).toHaveBeenCalled();
    expect(manager.getCurrentSessionStatus()?.status).toBe('ONAIR');
  });

  it('연장 시 forceEnd job을 재스케줄하고 extend 이벤트를 발행한다', async () => {
    const { manager, jobPort, eventPublisher } = createManager();

    const props: RealtimeSessionProps = {
      participationAvailable: true,
      startTime: '06:00',
      endTime: '06:30',
      attendanceList: [
        {
          user: {
            memberId: 301,
            email: 'rt@test.com',
            name: '실시간생성자',
            club: 'c',
            enrollmentNumber: '2021',
            role: [],
          },
          status: '참가',
          timeStamp: new Date('2026-06-14T21:00:00.000Z'),
        },
      ],
      creatorName: '실시간생성자',
      creatorId: 301,
    };

    await manager.startRealTimeSession(props);
    jest.clearAllMocks();

    await manager.extendSession();

    expect(jobPort.rescheduleForceEndJob).toHaveBeenCalled();
    expect(jobPort.removeForceEndAlarmJob).toHaveBeenCalled();
    expect(jobPort.rescheduleSessionExtendUnavailableJob).toHaveBeenCalled();
    expect(eventPublisher.publishExtendSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: expect.any(String),
        title: expect.any(String),
      }),
    );
    expect(eventPublisher.publishSessionListChanged).toHaveBeenCalled();
  });

  it('onDiscardReservation은 대상 세션을 DISCARDED로 바꾼다', async () => {
    const { manager, eventPublisher } = createManager();

    const regular: ReservationSessionProps = {
      reservationId: 702,
      reservationType: 'REGULAR',
      date: '2026-06-15',
      startTime: '13:00',
      endTime: '14:00',
      title: '폐기 대상',
      participationAvailable: true,
      creatorName: '생성자',
      status: 'BEFORE',
      attendanceList: [],
    };

    await manager.addReservationSessions([regular]);

    manager.onDiscardReservation({ reservationId: 702 });

    const discarded = manager
      .getSessionListStatus()
      .find((s) => 'reservationId' in s && s.reservationId === 702);
    expect(discarded?.status).toBe('DISCARDED');
    expect(eventPublisher.publishSessionListChanged).toHaveBeenCalled();
  });

  it('forceEndSessionIfMatching은 일치하는 ONAIR 세션을 종료하고 job을 제거한다', async () => {
    const { manager, jobPort, eventPublisher } = createManager();

    const props: RealtimeSessionProps = {
      participationAvailable: true,
      startTime: '06:00',
      endTime: '06:30',
      attendanceList: [],
      creatorName: '강제종료',
      creatorId: 401,
    };

    await manager.startRealTimeSession(props);
    const current = manager.getCurrentSessionStatus();
    expect(current).not.toBeNull();

    jest.clearAllMocks();

    const ok = await manager.forceEndSessionIfMatching(current!.sessionId);

    expect(ok).toBe(true);
    expect(manager.getCurrentSessionStatus()).toBeNull();
    const ended = manager
      .getSessionListStatus()
      .find((s) => String(s.sessionId) === String(current!.sessionId));
    expect(ended?.status).toBe('AFTER');
    expect(jobPort.removeForceEndJob).toHaveBeenCalledWith(current!.sessionId);
    expect(jobPort.removeForceEndAlarmJob).toHaveBeenCalledWith(
      current!.sessionId,
    );
    expect(eventPublisher.publishSessionListChanged).toHaveBeenCalled();
  });

  describe('isExtendAtMaxCap', () => {
    const attendanceUser = {
      user: {
        memberId: 301,
        email: 'rt@test.com',
        name: '실시간생성자',
        club: 'c',
        enrollmentNumber: '2021',
        role: [],
      },
      status: '참가' as const,
      timeStamp: new Date('2026-06-14T21:00:00.000Z'),
    };

    it('ONAIR 세션이 없으면 false를 반환한다', () => {
      const { manager } = createManager();

      expect(manager.isExtendAtMaxCap()).toBe(false);
    });

    it('다음 예약 start − 10분까지 여유가 있으면 false를 반환한다', async () => {
      const { manager } = createManager();

      await manager.startRealTimeSession({
        participationAvailable: true,
        startTime: '06:00',
        endTime: '06:58',
        attendanceList: [attendanceUser],
        creatorName: '실시간생성자',
        creatorId: 301,
      });
      await manager.addReservationSessions([
        {
          reservationId: 801,
          reservationType: 'REGULAR',
          date: '2026-06-15',
          plannedStartTime: '07:15',
          startTime: '07:15',
          endTime: '08:00',
          title: '후속 예약',
          participationAvailable: true,
          creatorName: '생성자',
          status: 'BEFORE',
          attendanceList: [],
        },
      ]);

      expect(manager.isExtendAtMaxCap()).toBe(false);
    });

    it('endTime이 다음 예약 start − 10분이면 true를 반환한다', async () => {
      const { manager } = createManager();

      await manager.startRealTimeSession({
        participationAvailable: true,
        startTime: '06:00',
        endTime: '07:05',
        attendanceList: [attendanceUser],
        creatorName: '실시간생성자',
        creatorId: 301,
      });
      await manager.addReservationSessions([
        {
          reservationId: 801,
          reservationType: 'REGULAR',
          date: '2026-06-15',
          plannedStartTime: '07:15',
          startTime: '07:15',
          endTime: '08:00',
          title: '후속 예약',
          participationAvailable: true,
          creatorName: '생성자',
          status: 'BEFORE',
          attendanceList: [],
        },
      ]);

      expect(manager.isExtendAtMaxCap()).toBe(true);
      expect(manager.getExtendMaxCapBlockedReason()).toBe(
        'NEXT_RESERVATION_CONFLICT',
      );
    });

    it('endTime이 CLOSE_HOUR이면 true를 반환한다', async () => {
      const { manager } = createManager();

      await manager.startRealTimeSession({
        participationAvailable: true,
        startTime: '21:00',
        endTime: '22:00',
        attendanceList: [attendanceUser],
        creatorName: '실시간생성자',
        creatorId: 301,
      });

      expect(manager.isExtendAtMaxCap()).toBe(true);
      expect(manager.getExtendMaxCapBlockedReason()).toBe(
        'OPERATING_HOURS_EXCEEDED',
      );
    });
  });
});
