import type { SessionDailyReservationSyncPayload } from '../../../domain/read-models/session-daily-reservation-sync.read-model';

export const SessionDailyReservationsSyncQueuePort = Symbol(
  'SessionDailyReservationsSyncQueuePort',
);

export interface SessionDailyReservationsSyncQueuePort {
  /** 오늘 예약 목록을 session 런타임에 반영하는 job을 넣고 완료까지 대기한다. */
  enqueueAndWait(
    payload: SessionDailyReservationSyncPayload,
    calendarDateYmd: string,
  ): Promise<void>;

  /** 동일 job을 넣되 완료를 기다리지 않는다 (재시도는 Bull이 처리). */
  enqueue(
    payload: SessionDailyReservationSyncPayload,
    calendarDateYmd: string,
  ): Promise<void>;
}
