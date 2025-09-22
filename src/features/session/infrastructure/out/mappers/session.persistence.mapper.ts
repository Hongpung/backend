import { RealtimeSession } from '../../../domain/entities/realtime-session.entity';
import { ReservationSession } from '../../../domain/entities/reservation-session.entity';
import type { SessionEntity } from '../../../application/ports/out/session-snapshot-store.port';
import type {
  RealtimeSessionSnapshot,
  ReservationSessionSnapshot,
  SessionSnapshot,
} from './session.persistence-model';
import {
  toOptionalValidSnapshotDate,
  toValidSnapshotDate,
} from '../cache/session-snapshot-datetime.util';
import { serializeSessionWallTime } from '../../session-wire-serialization.util';

export class SessionRestoreMapper {
  static fromSnapshot(snapshot: SessionSnapshot): SessionEntity {
    if (snapshot.sessionType === 'RESERVED') {
      return this.fromReservationSnapshot(snapshot);
    }
    return this.fromRealtimeSnapshot(snapshot);
  }

  static fromRealtimeSnapshot(
    snapshot: RealtimeSessionSnapshot,
  ): RealtimeSession {
    return RealtimeSession.rehydrate({
      sessionId: String(snapshot.sessionId),
      date: snapshot.date,
      title: snapshot.title,
      startTime: serializeSessionWallTime(snapshot.startTime),
      endTime: serializeSessionWallTime(snapshot.endTime),
      extendCount: snapshot.extendCount ?? 0,
      creatorName: snapshot.creatorName,
      creatorId: snapshot.creatorId,
      creatorNickname: snapshot.creatorNickname,
      participationAvailable: snapshot.participationAvailable,
      status: snapshot.status === 'AFTER' ? 'AFTER' : 'ONAIR',
      attendanceList: snapshot.attendanceList.map(
        ({ user, status, timeStamp }) => ({
          user,
          status: status as '참가',
          timeStamp: toValidSnapshotDate(timeStamp),
        }),
      ),
    });
  }

  static fromReservationSnapshot(
    snapshot: ReservationSessionSnapshot,
  ): ReservationSession {
    return ReservationSession.rehydrate({
      sessionId: String(snapshot.sessionId),
      reservationId: snapshot.reservationId,
      reservationType: snapshot.reservationType,
      date: snapshot.date,
      startTime: serializeSessionWallTime(snapshot.startTime),
      endTime: serializeSessionWallTime(snapshot.endTime),
      title: snapshot.title,
      extendCount: snapshot.extendCount ?? 0,
      participationAvailable: snapshot.participationAvailable,
      creatorName: snapshot.creatorName,
      creatorId: snapshot.creatorId,
      creatorNickname: snapshot.creatorNickname,
      participators: snapshot.participators ?? [],
      participatorIds: snapshot.participatorIds ?? [],
      borrowInstruments: snapshot.borrowInstruments ?? [],
      status: snapshot.status,
      plannedStartTime: serializeSessionWallTime(
        snapshot.plannedStartTime ?? snapshot.startTime,
      ),
      slotAttendanceCompensationApplied:
        snapshot.slotAttendanceCompensationApplied ?? false,
      attendanceList: snapshot.attendanceList.map(
        ({ user, status, timeStamp }) => ({
          user,
          status: status as '출석' | '결석' | '지각',
          timeStamp: toOptionalValidSnapshotDate(timeStamp),
        }),
      ),
    });
  }
}
