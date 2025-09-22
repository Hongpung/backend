import type { RealtimeSession } from 'src/features/session/domain/entities/realtime-session.entity';
import type { ReservationSession } from 'src/features/session/domain/entities/reservation-session.entity';
import type {
  SessionDiscardReservationNotification,
  SessionExtendNotification,
} from '../../models/session-event-notifications';

export interface PublishEndSessionPayload {
  sessionId: string | number;
  session: RealtimeSession | ReservationSession;
  returnImageUrl: string[] | null;
  forceEnd: boolean;
}

export const SessionEventPublisherPort = Symbol('SessionEventPublisherPort');

export interface SessionEventPublisherPort {
  publishEndSession(payload: PublishEndSessionPayload): Promise<void>;
  publishStartReservationSession(): void;
  publishSessionUpdate(): void;
  publishServerDownDiscardReservation(
    payload: SessionDiscardReservationNotification,
  ): void;
  publishSessionListChanged(): void;
  publishSessionListChangedAsync(): Promise<void>;
  publishStartRealtimeSession(): void;
  publishAttendSession(): void;
  publishExtendSession(payload: SessionExtendNotification): void;
}
