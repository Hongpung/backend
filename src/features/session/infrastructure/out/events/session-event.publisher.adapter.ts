import { Injectable } from '@nestjs/common';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import { EventBus } from 'src/infrastructure/events/event.provider';
import type { PublishEndSessionPayload } from 'src/features/session/application/ports/out/session-event-publisher.port';
import { SessionEventPublisherPort } from 'src/features/session/application/ports/out/session-event-publisher.port';
import type {
  SessionDiscardReservationNotification,
  SessionExtendNotification,
} from 'src/features/session/application/models/session-event-notifications';
import { SessionEventSnapshotMapper } from './mappers/session-event-snapshot.mapper';
import { SessionEventPayloadMapper } from './mappers/session-event-payload.mapper';

@Injectable()
export class SessionEventPublisherAdapter implements SessionEventPublisherPort {
  constructor(private readonly eventBus: EventBus) {}

  async publishEndSession(payload: PublishEndSessionPayload): Promise<void> {
    const session = SessionEventPayloadMapper.toSessionPayload(payload.session);
    if (
      session.sessionType === 'RESERVED' &&
      session.reservationType === 'EXTERNAL'
    ) {
      return;
    }

    const sessionSnapshot = SessionEventSnapshotMapper.toSnapshot({
      session,
      returnImageUrl: payload.returnImageUrl,
      forceEnd: payload.forceEnd,
    });
    await this.eventBus.emitAsyncTyped(EVENT_TOKEN.END_SESSION, {
      sessionId: payload.sessionId,
      sessionSnapshot,
    });
  }

  publishStartReservationSession(): void {
    this.eventBus.emitTyped(EVENT_TOKEN.START_RESERVATION_SESSION);
  }

  publishSessionUpdate(): void {
    this.eventBus.emitTyped(EVENT_TOKEN.SESSION_UPDATE);
  }

  publishServerDownDiscardReservation(
    payload: SessionDiscardReservationNotification,
  ): void {
    this.eventBus.emitTyped(EVENT_TOKEN.SERVER_DOWN_DISCARD_RESERVATION, {
      reservationId: payload.reservationId,
    });
  }

  publishSessionListChanged(): void {
    this.eventBus.emitTyped(EVENT_TOKEN.SESSION_LIST_CHANGED);
  }

  async publishSessionListChangedAsync(): Promise<void> {
    await this.eventBus.emitAsyncTyped(EVENT_TOKEN.SESSION_LIST_CHANGED);
  }

  publishStartRealtimeSession(): void {
    this.eventBus.emitTyped(EVENT_TOKEN.START_REALTIME_SESSION);
  }

  publishAttendSession(): void {
    this.eventBus.emitTyped(EVENT_TOKEN.ATTEND_SESSION);
  }

  publishExtendSession(payload: SessionExtendNotification): void {
    this.eventBus.emitTyped(EVENT_TOKEN.EXTEND_SESSION, {
      sessionId: payload.sessionId,
      remainingMsUntilPreviousEnd: payload.remainingMsUntilPreviousEnd,
      title: payload.title,
      startTimeMs: payload.startTimeMs,
      endTimeMs: payload.endTimeMs,
    });
  }
}
