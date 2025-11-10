import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AdminSessionLogQueryUseCasePort } from './ports/in/admin-session-log-query.use-case.port';
import { SessionLogRepositoryPort } from './ports/out/session-log.repository.port';
import type {
  AdminSessionCalendarDayReadModel,
  AdminSessionLogDetailReadModel,
} from '../domain/read-models/admin-session-log.read-model';
import {
  assertMonthNumber,
  assertPositiveInteger,
} from './session-log-query.validator';

@Injectable()
export class AdminSessionLogQueryService
  implements AdminSessionLogQueryUseCasePort
{
  constructor(
    @Inject(SessionLogRepositoryPort)
    private readonly repository: SessionLogRepositoryPort,
  ) {}

  async getLatestSessionLogs(
    skip: number = 0,
  ): Promise<AdminSessionLogDetailReadModel[]> {
    if (!Number.isInteger(skip) || skip < 0) {
      throw new BadRequestException('skip 값이 올바르지 않아요.');
    }

    return this.repository.findLatestSessions(10 * skip, 10);
  }

  async getAdminSessionCalendarForMonth(
    year: number,
    month: number,
  ): Promise<AdminSessionCalendarDayReadModel[]> {
    assertPositiveInteger(year, 'year');
    assertMonthNumber(month);

    return this.repository.findAdminSessionCalendarForMonth(year, month);
  }

  async getAdminSessionLogsByDate(
    dateString: string,
  ): Promise<AdminSessionLogDetailReadModel[]> {
    return this.repository.findAdminSessionLogsByDate(new Date(dateString));
  }
}
