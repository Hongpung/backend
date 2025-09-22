import type { SessionDailyReservationSyncPayload } from '../../../domain/read-models/session-daily-reservation-sync.read-model';
import type {
  ReservationSessionWirePayload,
  SessionWirePayload,
} from '../../session-wire-payload.type';

/**
 * Session BullMQ queue name used by processor/producer registrations.
 */
export const SESSION_QUEUE_NAME = 'session' as const;

/**
 * Session job names (BullMQ job.name).
 */
export const SESSION_JOB_TYPE = {
  FORCE_END_SESSION: 'force-end-session',
  FORCE_END_ALARM: 'force-end-alarm',
  SESSION_END_AVAILABLE: 'session-end-available',
  SESSION_EXTEND_UNAVAILABLE: 'session-extend-unavailable',
  START_EXTERNAL_RESERVATION: 'start-external-reservation',
  NO_SHOW_DISCARD_RESERVATION: 'no-show-discard-reservation',
  RESERVATION_START_REMIND: 'reservation-start-remind',
  SYNC_DAILY_RESERVATIONS: 'sync-daily-reservations',
} as const;

export type ReservationStartRemindJobPayload = {
  reservationId: number;
};

export type SessionJobType =
  (typeof SESSION_JOB_TYPE)[keyof typeof SESSION_JOB_TYPE];

/**
 * Session job payload map by job type.
 */
export type SessionJobData = {
  [SESSION_JOB_TYPE.FORCE_END_SESSION]: SessionWirePayload;
  [SESSION_JOB_TYPE.FORCE_END_ALARM]: SessionWirePayload;
  [SESSION_JOB_TYPE.SESSION_END_AVAILABLE]: SessionWirePayload;
  [SESSION_JOB_TYPE.SESSION_EXTEND_UNAVAILABLE]: SessionWirePayload;
  [SESSION_JOB_TYPE.START_EXTERNAL_RESERVATION]: ReservationSessionWirePayload;
  [SESSION_JOB_TYPE.NO_SHOW_DISCARD_RESERVATION]: ReservationSessionWirePayload;
  [SESSION_JOB_TYPE.RESERVATION_START_REMIND]: ReservationStartRemindJobPayload;
  [SESSION_JOB_TYPE.SYNC_DAILY_RESERVATIONS]: SessionDailyReservationSyncPayload;
};

/**
 * Helper type that resolves payload type by job type.
 */
export type SessionJobPayload<T extends SessionJobType> =
  T extends typeof SESSION_JOB_TYPE.FORCE_END_SESSION
    ? SessionWirePayload
    : T extends typeof SESSION_JOB_TYPE.FORCE_END_ALARM
      ? SessionWirePayload
      : T extends typeof SESSION_JOB_TYPE.SESSION_END_AVAILABLE
        ? SessionWirePayload
        : T extends typeof SESSION_JOB_TYPE.SESSION_EXTEND_UNAVAILABLE
          ? SessionWirePayload
          : T extends typeof SESSION_JOB_TYPE.START_EXTERNAL_RESERVATION
            ? ReservationSessionWirePayload
            : T extends typeof SESSION_JOB_TYPE.NO_SHOW_DISCARD_RESERVATION
              ? ReservationSessionWirePayload
              : T extends typeof SESSION_JOB_TYPE.RESERVATION_START_REMIND
              ? ReservationStartRemindJobPayload
              : T extends typeof SESSION_JOB_TYPE.SYNC_DAILY_RESERVATIONS
                ? SessionDailyReservationSyncPayload
                : never;

/**
 * Deterministic BullMQ job id generators by type.
 */
export const sessionJobId = {
  [SESSION_JOB_TYPE.FORCE_END_SESSION]: (sessionId: string) =>
    `${sessionId}-force-end`,
  [SESSION_JOB_TYPE.FORCE_END_ALARM]: (sessionId: string) =>
    `${sessionId}-force-end-alarm`,
  [SESSION_JOB_TYPE.SESSION_END_AVAILABLE]: (sessionId: string) =>
    `${sessionId}-session-end-available`,
  [SESSION_JOB_TYPE.SESSION_EXTEND_UNAVAILABLE]: (sessionId: string) =>
    `${sessionId}-session-extend-unavailable`,
  [SESSION_JOB_TYPE.START_EXTERNAL_RESERVATION]: (sessionId: string) =>
    `${sessionId}-start-external-reservation`,
  [SESSION_JOB_TYPE.NO_SHOW_DISCARD_RESERVATION]: (sessionId: string) =>
    `${sessionId}-no-show-discard-reservation`,
} as const;

export function syncDailyReservationsJobId(calendarDateYmd: string): string {
  return `sync-daily-reservations-${calendarDateYmd}`;
}

/**
 * Resolve job id from type and session id.
 */
export function getSessionJobId(
  type: SessionJobType,
  sessionId: string,
): string {
  return sessionJobId[type](sessionId);
}

/**
 * Queue port interface for testability and adapter abstraction.
 */
export interface ISessionQueue {
  add<T extends SessionJobType>(
    name: T,
    data: SessionJobData[T],
    options?: {
      delay?: number;
      attempts?: number;
      backoff?: number | { type: 'fixed' | 'exponential'; delay: number };
      removeOnComplete?: boolean | number;
      removeOnFail?: boolean | number;
      jobId?: string | number;
    },
  ): Promise<unknown>;

  getJob(jobId: string | number): Promise<unknown>;
}
