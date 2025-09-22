import type { SessionDailyReservationSyncPayload } from '../../../domain/read-models/session-daily-reservation-sync.read-model';

export const SessionDailyReservationReadPort = Symbol(
  'SessionDailyReservationReadPort',
);

export interface SessionDailyReservationReadPort {
  findTodayForSessionSync(): Promise<SessionDailyReservationSyncPayload>;
}
