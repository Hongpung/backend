import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import type { SessionSnapshotEventPayload } from 'src/contracts/events/event.payload';
import type {
  SessionWirePayload,
  ReservationSessionWirePayload,
} from '../../../session-wire-payload.type';

export class SessionEventSnapshotMapper {
  static toSnapshot(params: {
    session: SessionWirePayload;
    returnImageUrl: string[] | null;
    forceEnd: boolean;
  }): SessionSnapshotEventPayload {
    const { session, returnImageUrl, forceEnd } = params;
    const isReserved = this.isReservedSession(session);

    return {
      date: AppKstDateTime.dateFormmatForDB(session.date),
      startTime: AppKstDateTime.timeFormmatForDB(session.startTime),
      endTime: AppKstDateTime.timeFormmatForDB(session.endTime),
      creatorId: session.creatorId ?? null,
      title: session.title,
      sessionType: session.sessionType,
      reservationType: isReserved ? session.reservationType : null,
      reservationId: isReserved ? session.reservationId : null,
      extendCount: session.extendCount,
      participationAvailable: session.participationAvailable,
      returnImageUrl,
      forceEnd,
      attendanceList: session.attendanceList.map(
        ({ user, status, timeStamp }) => ({
          memberId: user.memberId,
          status,
          timeStamp: timeStamp ? new Date(timeStamp) : AppKstDateTime.getNowKoreanTime(),
        }),
      ),
      borrowInstruments: isReserved
        ? (session.borrowInstruments ?? []).map((instrument) => ({
            instrumentId: instrument.instrumentId,
            instrumentSnapshot: JSON.stringify(instrument),
          }))
        : [],
    };
  }

  private static isReservedSession(
    session: SessionWirePayload,
  ): session is ReservationSessionWirePayload {
    return session.sessionType === 'RESERVED';
  }
}
