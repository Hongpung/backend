import { describe, expect, it } from '@jest/globals';
import { SessionDomainService } from 'src/features/session/domain/runtime/session-domain.service';
import { RealtimeSession } from 'src/features/session/domain/entities/realtime-session.entity';
import { OnairSessionUseStateReadModelFactory } from 'src/features/session/domain/value-objects/onair-session-use-state.read-model';
import { OnairSessionLegacyWsPresenter } from './onair-legacy.presenter';

describe('OnairSessionLegacyWsPresenter', () => {
  it('현재 세션이 없으면 "null" 문자열을 반환한다', () => {
    const readModel = OnairSessionUseStateReadModelFactory.build({
      now: new Date('2026-06-10T03:00:00.000Z'),
      currentSession: null,
      nextReservationSession: null,
      followingBeforeReservation: null,
      domainService: new SessionDomainService(),
    });

    expect(OnairSessionLegacyWsPresenter.toJson(readModel)).toBe('null');
  });

  it('현재 세션이 있으면 usageControl 없이 SessionJson flat 객체를 반환한다', () => {
    const realtime = RealtimeSession.rehydrate({
      sessionId: 'r1',
      date: '2026-06-10',
      title: '실시간',
      startTime: '12:00',
      endTime: '12:30',
      extendCount: 0,
      creatorId: 1,
      creatorName: 'a',
      participationAvailable: true,
      status: 'ONAIR',
      attendanceList: [],
    });

    const readModel = OnairSessionUseStateReadModelFactory.build({
      now: new Date('2026-06-10T03:25:00.000Z'),
      currentSession: realtime,
      nextReservationSession: null,
      followingBeforeReservation: null,
      domainService: new SessionDomainService(),
    });

    const parsed = JSON.parse(
      OnairSessionLegacyWsPresenter.toJson(readModel),
    ) as Record<string, unknown>;

    expect(parsed.sessionId).toBe('r1');
    expect(parsed.sessionType).toBe('REALTIME');
    expect(parsed).not.toHaveProperty('usageControl');
    expect(parsed).not.toHaveProperty('currentSession');
  });
});
