import { ReservationSession } from '../../../../domain/entities/reservation-session.entity';
import { RealtimeSession } from '../../../../domain/entities/realtime-session.entity';
import type {
  SessionWirePayload,
  RealtimeSessionWirePayload,
  ReservationSessionWirePayload,
} from '../../../session-wire-payload.type';
import {
  serializeSessionTimeStamp,
  serializeSessionWallTime,
} from '../../../session-wire-serialization.util';

export class SessionResponseSessionMapper {
  static toResponse(
    session: RealtimeSession | ReservationSession,
  ): SessionWirePayload {
    if (session instanceof ReservationSession) {
      return this.toReservationResponse(session);
    }
    return this.toRealtimeResponse(session);
  }

  static toReservationResponse(
    session: ReservationSession,
  ): ReservationSessionWirePayload {
    return {
      reservationId: session.reservationId,
      reservationType: session.reservationType,
      plannedStartTime: serializeSessionWallTime(session.plannedSlotStartHHmm),
      slotAttendanceCompensationApplied:
        session.slotAttendanceCompensationApplied,
      sessionId: session.sessionId,
      date: session.date,
      sessionType: 'RESERVED',
      title: session.title,
      startTime: serializeSessionWallTime(session.startTime),
      endTime: serializeSessionWallTime(session.endTime),
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
        ({ user, status, timeStamp }) => {
          const parsedTimeStamp = timeStamp
            ? serializeSessionTimeStamp(timeStamp)
            : undefined;
          return {
            user,
            status: status as '출석' | '결석' | '지각',
            ...(parsedTimeStamp !== undefined
              ? { timeStamp: parsedTimeStamp }
              : {}),
          };
        },
      ),
    };
  }

  private static toRealtimeResponse(
    session: RealtimeSession,
  ): RealtimeSessionWirePayload {
    return {
      sessionId: session.sessionId,
      date: session.date,
      sessionType: 'REALTIME',
      title: session.title,
      startTime: serializeSessionWallTime(session.startTime),
      endTime: serializeSessionWallTime(session.endTime),
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
          timeStamp: serializeSessionTimeStamp(timeStamp ?? new Date()),
        }),
      ),
    };
  }
}
