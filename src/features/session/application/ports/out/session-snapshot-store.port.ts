import type { RealtimeSession } from 'src/features/session/domain/entities/realtime-session.entity';
import type { ReservationSession } from 'src/features/session/domain/entities/reservation-session.entity';

export type SessionEntity = RealtimeSession | ReservationSession;

export const SessionSnapshotStorePort = Symbol('SessionSnapshotStorePort');

export interface SessionSnapshotStorePort {
  save(sessions: SessionEntity[]): Promise<void>;
  load(): Promise<{ date: string; list: SessionEntity[] } | null>;
}
