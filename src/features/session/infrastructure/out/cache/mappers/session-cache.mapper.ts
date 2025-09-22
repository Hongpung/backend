import { ReservationSession } from '../../../../domain/entities/reservation-session.entity';
import { RealtimeSession } from '../../../../domain/entities/realtime-session.entity';
import type { SessionEntity } from '../../../../application/ports/out/session-snapshot-store.port';
import type {
  RealtimeSessionSnapshot,
  ReservationSessionSnapshot,
  SessionSnapshot,
} from '../../mappers/session.persistence-model';
import {
  toOptionalValidSnapshotDate,
  toValidSnapshotDate,
} from '../session-snapshot-datetime.util';
import { serializeSessionWallTime } from '../../../session-wire-serialization.util';

export class SessionCacheMapper {
  static toSnapshot(session: SessionEntity): SessionSnapshot {
    if (session instanceof ReservationSession) {
      return this.toReservationSnapshot(session);
    }
    return this.toRealtimeSnapshot(session);
  }

  private static toRealtimeSnapshot(
    session: RealtimeSession,
  ): RealtimeSessionSnapshot {
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
          timeStamp: toValidSnapshotDate(timeStamp),
        }),
      ),
    };
  }

  private static toReservationSnapshot(
    session: ReservationSession,
  ): ReservationSessionSnapshot {
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
          const parsedTimeStamp = toOptionalValidSnapshotDate(timeStamp);
          return {
            user,
            status: status as '출석' | '결석' | '지각',
            ...(parsedTimeStamp !== undefined ? { timeStamp: parsedTimeStamp } : {}),
          };
        },
      ),
    };
  }
}
