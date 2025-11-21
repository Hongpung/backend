import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import { SessionEventPublisherAdapter } from './session-event.publisher.adapter';
import { ReservationSession } from 'src/features/session/domain/entities/reservation-session.entity';

describe('SessionEventPublisherAdapter', () => {
  let adapter: SessionEventPublisherAdapter;
  let eventBus: any;

  const reservationSession = (reservationType: 'REGULAR' | 'EXTERNAL') =>
    ReservationSession.rehydrate({
      sessionId: reservationType === 'EXTERNAL' ? 's-ext' : 'session-1',
      reservationId: reservationType === 'EXTERNAL' ? 99 : 12,
      reservationType,
      date: '2026-04-20',
      title: reservationType === 'EXTERNAL' ? 'Ext' : 'Weekly Practice',
      startTime: '09:00',
      endTime: '10:00',
      extendCount: 0,
      creatorId: 1,
      creatorName: reservationType === 'EXTERNAL' ? 'x' : 'Hong',
      participationAvailable: reservationType !== 'EXTERNAL',
      status: 'AFTER',
      participators: [],
      participatorIds: [],
      borrowInstruments: [],
      attendanceList: [],
    });

  beforeEach(() => {
    eventBus = {
      emitTyped: jest.fn(),
      emitAsyncTyped: jest.fn(async () => []),
      onTyped: jest.fn(),
      onceTyped: jest.fn(),
    };

    adapter = new SessionEventPublisherAdapter(eventBus);
  });

  it('publishes session update event', () => {
    adapter.publishSessionUpdate();
    expect(eventBus.emitTyped).toHaveBeenCalledWith(EVENT_TOKEN.SESSION_UPDATE);
  });

  it('publishes end session event asynchronously', async () => {
    await adapter.publishEndSession({
      sessionId: 's-1',
      session: reservationSession('REGULAR'),
      returnImageUrl: null,
      forceEnd: false,
    });
    expect(eventBus.emitAsyncTyped).toHaveBeenCalledWith(
      EVENT_TOKEN.END_SESSION,
      expect.objectContaining({
        sessionId: 's-1',
        sessionSnapshot: expect.objectContaining({
          title: 'Weekly Practice',
        }),
      }),
    );
  });

  it('EXTERNAL RESERVED 종료 이벤트는 발행하지 않는다', async () => {
    await adapter.publishEndSession({
      sessionId: 's-ext',
      session: reservationSession('EXTERNAL'),
      returnImageUrl: null,
      forceEnd: false,
    });
    expect(eventBus.emitAsyncTyped).not.toHaveBeenCalled();
  });
});
