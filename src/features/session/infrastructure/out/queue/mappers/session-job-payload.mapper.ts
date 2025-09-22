import { ReservationSession } from '../../../../domain/entities/reservation-session.entity';
import { RealtimeSession } from '../../../../domain/entities/realtime-session.entity';
import type {
  SessionWirePayload,
  RealtimeSessionWirePayload,
  ReservationSessionWirePayload,
} from '../../../session-wire-payload.type';

export class SessionJobPayloadMapper {
  static toForceEndPayload(
    session: RealtimeSession | ReservationSession,
  ): SessionWirePayload {
    if (session instanceof ReservationSession) {
      return this.toReservationPayload(session);
    }
    return this.toRealtimePayload(session);
  }

  static toReservationPayload(
    session: ReservationSession,
  ): ReservationSessionWirePayload {
    return {
      reservationId: session.reservationId,
      reservationType: session.reservationType,
      plannedStartTime: session.plannedSlotStartHHmm,
      slotAttendanceCompensationApplied:
        session.slotAttendanceCompensationApplied,
      sessionId: session.sessionId,
      date: session.date,
      sessionType: 'RESERVED',
      title: session.title,
      startTime: session.startTime,
      endTime: session.endTime,
      extendCount: session.extendCount,
      creatorId: session.creatorId,
      creatorName: session.creatorName,
      creatorNickname: session.creatorNickname,
      participationAvailable: session.participationAvailable,
      status: session.status,
      participators: [...session.participators],
      participatorIds: [...session.participatorIds],
      borrowInstruments: [...session.borrowInstruments],
      attendanceList: session.attendanceList.map(
        ({ user, status, timeStamp }) => ({
          user,
          status: status as '출석' | '결석' | '지각',
          timeStamp: timeStamp ?? new Date(),
        }),
      ),
    };
  }

  private static toRealtimePayload(
    session: RealtimeSession,
  ): RealtimeSessionWirePayload {
    return {
      sessionId: session.sessionId,
      date: session.date,
      sessionType: 'REALTIME',
      title: session.title,
      startTime: session.startTime,
      endTime: session.endTime,
      extendCount: session.extendCount,
      creatorId: session.creatorId,
      creatorName: session.creatorName,
      creatorNickname: session.creatorNickname,
      participationAvailable: session.participationAvailable,
      status: session.status === 'AFTER' ? 'AFTER' : 'ONAIR',
      attendanceList: session.attendanceList.map(
        ({ user, status, timeStamp }) => ({
          user,
          status: status as '참가',
          timeStamp: timeStamp ?? new Date(),
        }),
      ),
    };
  }
}
