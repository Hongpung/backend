import type {
  AdminSessionCalendarDayReadModel,
  AdminSessionLogDetailReadModel,
} from '../../../domain/read-models/admin-session-log.read-model';

export const AdminSessionLogQueryUseCasePort = Symbol(
  'AdminSessionLogQueryUseCasePort',
);

export interface AdminSessionLogQueryUseCasePort {
  getLatestSessionLogs(
    skip?: number,
  ): Promise<AdminSessionLogDetailReadModel[]>;
  getAdminSessionCalendarForMonth(
    year: number,
    month: number,
  ): Promise<AdminSessionCalendarDayReadModel[]>;
  getAdminSessionLogsByDate(
    dateString: string,
  ): Promise<AdminSessionLogDetailReadModel[]>;
}
