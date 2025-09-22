import type {
  AdminSessionCalendarDayReadModel,
  AdminSessionLogDetailReadModel,
} from '../../../domain/read-models/admin-session-log.read-model';
import type {
  SessionLogDetailReadModel,
  SessionLogListItemReadModel,
} from '../../../domain/read-models/session-log.read-model';

export const SessionLogRepositoryPort = Symbol('SessionLogRepositoryPort');

export interface MemberClubId {
  clubId: number | null;
}

export interface SessionLogRepositoryPort {
  findUserMonthlyAttendances(
    memberId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<SessionLogListItemReadModel[]>;
  findMemberClubId(memberId: number): Promise<MemberClubId | null>;
  findClubMonthlySessions(
    clubId: number,
    reservationType: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SessionLogListItemReadModel[]>;
  findSessionBySessionId(
    sessionId: number,
  ): Promise<SessionLogDetailReadModel | null>;
  findSessionByReservationId(
    reservationId: number,
  ): Promise<SessionLogDetailReadModel | null>;
  findLatestSessions(
    skip: number,
    take: number,
  ): Promise<AdminSessionLogDetailReadModel[]>;
  findAdminSessionCalendarForMonth(
    year: number,
    month: number,
  ): Promise<AdminSessionCalendarDayReadModel[]>;
  findAdminSessionLogsByDate(
    date: Date,
  ): Promise<AdminSessionLogDetailReadModel[]>;
}
