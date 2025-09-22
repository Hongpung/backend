import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import type { SessionLogDetailReadModel } from '../../../../domain/read-models/session-log-detail.read-model';
import { ReservationSession } from '../../../../domain/entities/reservation-session.entity';
import { RealtimeSession } from '../../../../domain/entities/realtime-session.entity';
import type { ReservationSessionWirePayload } from '../../../session-wire-payload.type';
import { SessionResponseSessionMapper } from './session-response-session.mapper';

/** session-log GET /specific/:sessionId 와 같은 JSON. DB 재조회 없이 종료 스냅샷으로 조립 */
export class EndSessionLogDetailMapper {
  static fromEndedSession(params: {
    session: RealtimeSession | ReservationSession;
    sessionLogId: number;
    returnImageUrls: string[];
    forceEnd: boolean;
  }): SessionLogDetailReadModel {
    const wire = SessionResponseSessionMapper.toResponse(params.session);
    const isReserved = wire.sessionType === 'RESERVED';

    return {
      sessionId: params.sessionLogId,
      creatorId: wire.creatorId ?? null,
      creatorName: wire.creatorName,
      creatorNickname: wire.creatorNickname ?? null,
      title: wire.title,
      date: wire.date,
      startTime: AppKstDateTime.deserializeReservationTimeToHHmm(wire.startTime),
      endTime: AppKstDateTime.deserializeReservationTimeToHHmm(wire.endTime),
      sessionType: wire.sessionType,
      reservationType: isReserved ? wire.reservationType : null,
      participationAvailable: wire.participationAvailable,
      forceEnd: params.forceEnd,
      extendCount: wire.extendCount,
      returnImageUrl: params.returnImageUrls,
      reservationId: isReserved ? wire.reservationId : null,
      attendanceList: wire.attendanceList.map(({ user, status, timeStamp }) => ({
        member: {
          memberId: user.memberId,
          name: user.name,
          nickname: user.nickname ?? null,
          blogUrl: null,
          enrollmentNumber: user.enrollmentNumber,
          profileImageUrl: user.profileImageUrl ?? null,
          instagramUrl: null,
          club: user.club,
          role: [...user.role],
        },
        status,
        timeStamp: this.formatAttendanceTimeStamp(timeStamp),
      })),
      borrowInstruments: isReserved
        ? this.mapBorrowInstruments(wire)
        : [],
    };
  }

  private static formatAttendanceTimeStamp(
    timeStamp: string | Date | undefined,
  ): string | null {
    if (timeStamp == null) {
      return null;
    }
    const value = timeStamp instanceof Date ? timeStamp : new Date(timeStamp);
    return AppKstDateTime.timeFormmatForClient(value);
  }

  private static mapBorrowInstruments(
    wire: ReservationSessionWirePayload,
  ): SessionLogDetailReadModel['borrowInstruments'] {
    return (wire.borrowInstruments ?? []).map((instrument) => ({
      imageUrl: instrument.imageUrl ?? null,
      name: instrument.name,
      instrumentType: instrument.instrumentType,
      club: instrument.club,
    }));
  }
}
