import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import type { SessionLogPersistRpcRequest } from 'src/contracts/rpc/session-log-persist.rpc';
import type { ReservationSession } from '../../../domain/entities/reservation-session.entity';
import type { RealtimeSession } from '../../../domain/entities/realtime-session.entity';
import { SessionEventPayloadMapper } from './mappers/session-event-payload.mapper';
import { SessionEventSnapshotMapper } from './mappers/session-event-snapshot.mapper';

export class SessionEndSnapshotBuilder {
  static toPersistRequest(params: {
    session: RealtimeSession | ReservationSession;
    returnImageUrls: string[] | null;
    forceEnd: boolean;
  }): SessionLogPersistRpcRequest {
    const wire = SessionEventPayloadMapper.toSessionPayload(params.session);
    const snapshot = SessionEventSnapshotMapper.toSnapshot({
      session: wire,
      returnImageUrl: params.returnImageUrls,
      forceEnd: params.forceEnd,
    });

    return {
      ...snapshot,
      runtimeSessionId: params.session.sessionId,
      /** persist 시점의 실제 종료 시각(KST)을 DB endTime에 기록 */
      endTime: AppKstDateTime.timeFormmatForDB(
        AppKstDateTime.timeFormmatForClient(AppKstDateTime.getNowKoreanTime()),
      ),
    };
  }
}
