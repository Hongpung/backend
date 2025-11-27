import type { OnairSessionUseStateReadModel } from 'src/features/session/domain/value-objects/onair-session-use-state.read-model';
import { ReservationSession } from 'src/features/session/domain/entities/reservation-session.entity';
import { RealtimeSession } from 'src/features/session/domain/entities/realtime-session.entity';
import { SessionWebSocketMapper } from './mappers/session-ws-session.mapper';

/**
 * v1 `/roomsession` wire format: JSON.stringify(SessionJson | null) without usageControl envelope.
 */
export class OnairSessionLegacyWsPresenter {
  static toJson(readModel: OnairSessionUseStateReadModel): string {
    const { currentSession } = readModel;

    if (
      currentSession instanceof RealtimeSession ||
      currentSession instanceof ReservationSession
    ) {
      return JSON.stringify(SessionWebSocketMapper.toPayload(currentSession));
    }

    return 'null';
  }
}
