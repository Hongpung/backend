import type { SessionLogPersistRpcRequest } from 'src/contracts/rpc/session-log-persist.rpc';
import type { ReservationSession } from '../../../domain/entities/reservation-session.entity';
import type { RealtimeSession } from '../../../domain/entities/realtime-session.entity';

export const EndSessionSnapshotPort = Symbol('EndSessionSnapshotPort');

export interface EndSessionSnapshotPort {
  toPersistRequest(params: {
    session: RealtimeSession | ReservationSession;
    returnImageUrls: string[] | null;
    forceEnd: boolean;
  }): SessionLogPersistRpcRequest;
}
