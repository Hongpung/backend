import type { CheckInSessionStateResultVo } from '../../../../domain/value-objects/check-in-result.vo';
import type { CheckInSessionStateResDto } from '../dto/response';
import { ReservationSession } from '../../../../domain/entities/reservation-session.entity';
import { RealtimeSession } from '../../../../domain/entities/realtime-session.entity';
import type { ReservationSessionWirePayload } from '../../../session-wire-payload.type';
import { SessionResponseSessionMapper } from './session-response-session.mapper';

export class CheckInResponseMapper {
  private static toReservationPayload(
    session: ReservationSessionWirePayload | ReservationSession,
  ): ReservationSessionWirePayload {
    return session instanceof ReservationSession
      ? SessionResponseSessionMapper.toReservationResponse(session)
      : session;
  }

  static toSessionStateResDto(
    result: CheckInSessionStateResultVo,
  ): CheckInSessionStateResDto {
    switch (result.status) {
      case 'CREATABLE':
        return {
          ...result,
          nextReservationSession: result.nextReservationSession
            ? this.toReservationPayload(result.nextReservationSession)
            : null,
        };
      case 'STARTABLE':
        return {
          ...result,
          nextReservationSession: this.toReservationPayload(
            result.nextReservationSession,
          ),
        };
      case 'JOINABLE':
        return {
          ...result,
          currentSession:
            result.currentSession instanceof RealtimeSession ||
            result.currentSession instanceof ReservationSession
              ? SessionResponseSessionMapper.toResponse(result.currentSession)
              : result.currentSession,
        };
      case 'UNAVAILABLE':
        return result;
    }
  }
}
