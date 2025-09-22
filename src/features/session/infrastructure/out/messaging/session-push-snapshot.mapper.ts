import type { SessionPushSessionSnapshot } from '../../../application/models/session-push-notification.model';
import type {
  ReservationSessionWirePayload,
  SessionWirePayload,
} from '../../session-wire-payload.type';

export class SessionPushSnapshotMapper {
  static fromWire(payload: SessionWirePayload): SessionPushSessionSnapshot {
    const reservationType =
      payload.sessionType === 'RESERVED'
        ? (payload as ReservationSessionWirePayload).reservationType
        : undefined;

    return {
      sessionId: payload.sessionId,
      title: payload.title,
      sessionType: payload.sessionType,
      reservationType,
      attendance: payload.attendanceList.map(({ user, status }) => ({
        memberId: user.memberId,
        status,
      })),
    };
  }
}
