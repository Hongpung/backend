import type {
  SessionLogDetailReadModel,
  SessionLogListItemReadModel,
} from '../../../domain/read-models/session-log.read-model';

export const SessionLogQueryUseCasePort = Symbol('SessionLogQueryUseCasePort');

export interface GetUserMonthlySessionLogsParams {
  memberId: number;
  year: number;
  month: number;
}

export interface GetClubMonthlySessionLogsParams {
  memberId: number;
  year: number;
  month: number;
}

export interface GetSessionInfoBySessionIdParams {
  sessionId: number;
}

export interface GetSessionInfoByReservationIdParams {
  reservationId: number;
}

export interface SessionLogQueryUseCasePort {
  getUserMonthlySessionLogs(
    params: GetUserMonthlySessionLogsParams,
  ): Promise<SessionLogListItemReadModel[]>;
  getClubMonthlySessionLogs(
    params: GetClubMonthlySessionLogsParams,
  ): Promise<SessionLogListItemReadModel[]>;
  getSessionInfoBySessionId(
    params: GetSessionInfoBySessionIdParams,
  ): Promise<SessionLogDetailReadModel | null>;
  getSessionInfoByReservationId(
    params: GetSessionInfoByReservationIdParams,
  ): Promise<SessionLogDetailReadModel | null>;
}
