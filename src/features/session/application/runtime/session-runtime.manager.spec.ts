import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { SessionRuntimeManager } from 'src/features/session/application/runtime/session-runtime.manager';
import { SessionDomainService } from 'src/features/session/domain/runtime/session-domain.service';
import type { ReservationSessionProps } from 'src/features/session/domain/entities/reservation-session.entity';

describe('SessionRuntimeManager', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    /** KST 2026-06-15 06:00 — 종료까지 여유 있어 알람 job도 등록된다 */
    jest.setSystemTime(new Date('2026-06-14T21:00:00.000Z'));
  });

  it('외부 예약 자동 시작은 payload와 일치하는 세션만 ONAIR로 만든다', async () => {
    const cache = {
      load: jest.fn().mockImplementation(async () => null),
      save: jest.fn().mockImplementation(async () => {}),
      clear: jest.fn().mockImplementation(async () => {}),
    };

    const jobPort = {
      addForceEndJob: jest.fn().mockImplementation(async () => {}),
      addForceEndAlarmJob: jest.fn().mockImplementation(async () => {}),
      addSessionEndAvailableJob: jest.fn().mockImplementation(async () => {}),
      addSessionExtendUnavailableJob: jest
        .fn()
        .mockImplementation(async () => {}),
      removeSessionEndAvailableJob: jest.fn().mockImplementation(async () => {}),
      removeSessionExtendUnavailableJob: jest
        .fn()
        .mockImplementation(async () => {}),
      rescheduleSessionExtendUnavailableJob: jest
        .fn()
        .mockImplementation(async () => {}),
      addNoShowDiscardJob: jest.fn().mockImplementation(async () => {}),
      removeNoShowDiscardJob: jest.fn().mockImplementation(async () => {}),
      addStartExternalReservationJob: jest
        .fn()
        .mockImplementation(async () => {}),
      removeStartExternalReservationJob: jest
        .fn()
        .mockImplementation(async () => {}),
      removeForceEndJob: jest.fn().mockImplementation(async () => {}),
      removeForceEndAlarmJob: jest.fn().mockImplementation(async () => {}),
      rescheduleForceEndJob: jest.fn().mockImplementation(async () => {}),
    };

    const publisher = {
      publishSessionListChanged: jest.fn(),
      publishStartReservationSession: jest.fn(),
      publishServerDownDiscardReservation: jest.fn(),
      publishSessionListChangedAsync: jest
        .fn()
        .mockImplementation(async () => {}),
    };

    const discardedReservationWrite = {
      saveNoShowByReservationId: jest.fn(async () => undefined),
    };

    const manager = new SessionRuntimeManager(
      cache as any,
      jobPort as any,
      new SessionDomainService(),
      publisher as any,
      discardedReservationWrite as any,
    );

    const extA: ReservationSessionProps = {
      reservationId: 501,
      reservationType: 'EXTERNAL',
      date: '2026-06-15',
      startTime: '10:00',
      endTime: '11:00',
      title: 'Ext A',
      participationAvailable: false,
      creatorName: '외부主催',
      status: 'BEFORE',
      attendanceList: [],
    };

    const extB: ReservationSessionProps = {
      reservationId: 502,
      reservationType: 'EXTERNAL',
      date: '2026-06-15',
      startTime: '13:00',
      endTime: '14:00',
      title: 'Ext B',
      participationAvailable: false,
      creatorName: '외부主催',
      status: 'BEFORE',
      attendanceList: [],
    };

    await manager.addReservationSessions([extA, extB]);

    const listBefore = manager.getSessionListStatus();
    const bJson = listBefore.find(
      (j) =>
        j.sessionType === 'RESERVED' &&
        'reservationId' in j &&
        j.reservationId === 502,
    );
    if (!bJson || bJson.sessionType !== 'RESERVED') {
      throw new Error('B session missing');
    }

    await manager.startExternalReservationSession({
      sessionId: String(bJson.sessionId),
      reservationId: 502,
    });

    const listAfter = manager.getSessionListStatus();
    const statusA = listAfter.find(
      (j) => 'reservationId' in j && j.reservationId === 501,
    );
    const statusB = listAfter.find(
      (j) => 'reservationId' in j && j.reservationId === 502,
    );

    expect(statusA?.status).toBe('BEFORE');
    expect(statusB?.status).toBe('ONAIR');

    expect(jobPort.addForceEndJob).toHaveBeenCalled();
    expect(jobPort.addForceEndAlarmJob).toHaveBeenCalled();
    expect(jobPort.addSessionEndAvailableJob).toHaveBeenCalled();
    expect(jobPort.addSessionExtendUnavailableJob).toHaveBeenCalled();
  });
});
