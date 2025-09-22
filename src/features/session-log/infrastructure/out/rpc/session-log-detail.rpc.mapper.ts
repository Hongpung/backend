import type { SessionLogDetailRpc } from 'src/contracts/rpc/session-log-detail.rpc';
import type { SessionLogDetailReadModel } from '../../../domain/read-models/session-log.read-model';

export class SessionLogDetailRpcMapper {
  static toRpc(detail: SessionLogDetailReadModel): SessionLogDetailRpc {
    return {
      sessionId: detail.sessionId,
      creatorId: detail.creatorId,
      creatorName: detail.creatorName,
      creatorNickname: detail.creatorNickname,
      title: detail.title,
      date: detail.date,
      startTime: detail.startTime,
      endTime: detail.endTime,
      sessionType: detail.sessionType,
      reservationType: detail.reservationType,
      participationAvailable: detail.participationAvailable,
      forceEnd: detail.forceEnd,
      extendCount: detail.extendCount,
      returnImageUrl: detail.returnImageUrl,
      reservationId: detail.reservationId,
      attendanceList: detail.attendanceList.map((row) => ({
        member: { ...row.member },
        status: row.status,
        timeStamp: row.timeStamp,
      })),
      borrowInstruments: detail.borrowInstruments.map((row) => ({
        ...row,
      })),
    };
  }
}
