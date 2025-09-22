import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  SessionLogQueryUseCasePort,
  GetClubMonthlySessionLogsParams,
  GetSessionInfoByReservationIdParams,
  GetSessionInfoBySessionIdParams,
  GetUserMonthlySessionLogsParams,
} from './ports/in/session-log-query.use-case.port';
import { SessionLogRepositoryPort } from './ports/out/session-log.repository.port';
import {
  assertMonthNumber,
  assertPositiveInteger,
} from './session-log-query.validator';
import type {
  SessionLogDetailReadModel,
  SessionLogListItemReadModel,
} from '../domain/read-models/session-log.read-model';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

@Injectable()
export class SessionLogQueryService implements SessionLogQueryUseCasePort {
  constructor(
    @Inject(SessionLogRepositoryPort)
    private readonly repository: SessionLogRepositoryPort,
  ) {}

  async getUserMonthlySessionLogs(
    params: GetUserMonthlySessionLogsParams,
  ): Promise<SessionLogListItemReadModel[]> {
    assertPositiveInteger(params.memberId, 'memberId');
    assertPositiveInteger(params.year, 'year');
    assertMonthNumber(params.month);

    const { startDate, endDate } = this.monthDateRangeForDb(
      params.year,
      params.month,
    );

    return this.repository.findUserMonthlyAttendances(
      params.memberId,
      startDate,
      endDate,
    );
  }

  async getClubMonthlySessionLogs(
    params: GetClubMonthlySessionLogsParams,
  ): Promise<SessionLogListItemReadModel[]> {
    assertPositiveInteger(params.memberId, 'memberId');
    assertPositiveInteger(params.year, 'year');
    assertMonthNumber(params.month);

    const { startDate, endDate } = this.monthDateRangeForDb(
      params.year,
      params.month,
    );

    const userInfo = await this.repository.findMemberClubId(params.memberId);

    if (!userInfo || userInfo.clubId == null) {
      throw new BadRequestException('동아리에 가입된 유저가 아니에요.');
    }

    return this.repository.findClubMonthlySessions(
      userInfo.clubId,
      'REGULAR',
      startDate,
      endDate,
    );
  }

  async getSessionInfoBySessionId(
    params: GetSessionInfoBySessionIdParams,
  ): Promise<SessionLogDetailReadModel | null> {
    assertPositiveInteger(params.sessionId, 'sessionId');
    return this.repository.findSessionBySessionId(params.sessionId);
  }

  async getSessionInfoByReservationId(
    params: GetSessionInfoByReservationIdParams,
  ): Promise<SessionLogDetailReadModel | null> {
    assertPositiveInteger(params.reservationId, 'reservationId');
    return this.repository.findSessionByReservationId(params.reservationId);
  }

  /** API `month`는 1~12. DB date 앵커 범위로 변환한다. */
  private monthDateRangeForDb(
    year: number,
    month: number,
  ): { startDate: Date; endDate: Date } {
    const monthPadded = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const startYmd = `${year}-${monthPadded}-01`;
    const endYmd = `${year}-${monthPadded}-${String(lastDay).padStart(2, '0')}`;
    return {
      startDate: AppKstDateTime.dateFormmatForDB(startYmd),
      endDate: AppKstDateTime.dateFormmatForDB(endYmd),
    };
  }
}
