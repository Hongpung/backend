import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { AdminSessionLogQueryService } from './admin-session-log-query.service';
import type { SessionLogRepositoryPort } from './ports/out/session-log.repository.port';
import type {
  AdminSessionCalendarDayReadModel,
  AdminSessionLogDetailReadModel,
} from '../domain/read-models/admin-session-log.read-model';

function createRepositoryMock(): jest.Mocked<SessionLogRepositoryPort> {
  return {
    findUserMonthlyAttendances: jest.fn(),
    findMemberClubId: jest.fn(),
    findClubMonthlySessions: jest.fn(),
    findSessionBySessionId: jest.fn(),
    findSessionByReservationId: jest.fn(),
    findLatestSessions: jest.fn(),
    findAdminSessionCalendarForMonth: jest.fn(),
    findAdminSessionLogsByDate: jest.fn(),
  };
}

function adminDetailFixture(
  overrides: Partial<AdminSessionLogDetailReadModel> = {},
): AdminSessionLogDetailReadModel {
  return {
    sessionId: 1,
    creatorId: 100,
    creatorName: '관리',
    creatorNickname: 'ad',
    date: '2026-06-10',
    startTime: '11:00',
    endTime: '13:00',
    sessionType: 'RESERVED',
    participationAvailable: true,
    reservationType: 'REGULAR',
    title: '관리자뷰',
    extendCount: 1,
    returnImageUrl: 'https://x.test/img',
    forceEnd: false,
    attendanceList: [],
    borrowInstruments: [],
    ...overrides,
  };
}

describe('AdminSessionLogQueryService', () => {
  let service: AdminSessionLogQueryService;
  let repository: jest.Mocked<SessionLogRepositoryPort>;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new AdminSessionLogQueryService(repository);
  });

  describe('getLatestSessionLogs', () => {
    it('skip이 음수면 BadRequestException', async () => {
      await expect(service.getLatestSessionLogs(-1)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.findLatestSessions).not.toHaveBeenCalled();
    });

    it('skip이 정수가 아니면 BadRequestException', async () => {
      await expect(service.getLatestSessionLogs(1.5)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('skip 0이면 findLatestSessions(0, 10)', async () => {
      repository.findLatestSessions.mockResolvedValue([]);

      await service.getLatestSessionLogs(0);

      expect(repository.findLatestSessions).toHaveBeenCalledWith(0, 10);
    });

    it('skip 2이면 findLatestSessions(20, 10)', async () => {
      repository.findLatestSessions.mockResolvedValue([]);

      await service.getLatestSessionLogs(2);

      expect(repository.findLatestSessions).toHaveBeenCalledWith(20, 10);
    });
  });

  describe('getAdminSessionCalendarForMonth', () => {
    it('year가 유효하지 않으면 BadRequestException', async () => {
      await expect(
        service.getAdminSessionCalendarForMonth(0, 1),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('month가 1~12 밖이면 BadRequestException', async () => {
      await expect(
        service.getAdminSessionCalendarForMonth(2024, 0),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('일별 카운트 read model을 그대로 반환한다', async () => {
      const days: AdminSessionCalendarDayReadModel[] = [
        { date: '2026-06-01', sessionCount: 2 },
        { date: '2026-06-03', sessionCount: 1 },
      ];
      repository.findAdminSessionCalendarForMonth.mockResolvedValue(days);

      const result = await service.getAdminSessionCalendarForMonth(2026, 6);

      expect(repository.findAdminSessionCalendarForMonth).toHaveBeenCalledWith(
        2026,
        6,
      );
      expect(result).toEqual([
        { date: '2026-06-01', sessionCount: 2 },
        { date: '2026-06-03', sessionCount: 1 },
      ]);
    });
  });

  describe('getAdminSessionLogsByDate', () => {
    it('해당 날짜 조회 후 read model을 그대로 반환한다', async () => {
      const s = adminDetailFixture({ sessionId: 3 });
      repository.findAdminSessionLogsByDate.mockResolvedValue([s]);

      const result = await service.getAdminSessionLogsByDate('2026-06-10');

      expect(repository.findAdminSessionLogsByDate).toHaveBeenCalledWith(
        new Date('2026-06-10'),
      );
      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe(3);
      expect(result[0].date).toBe('2026-06-10');
      expect(result[0].startTime).toBe('11:00');
      expect(result[0].endTime).toBe('13:00');
      expect(result[0].title).toBe('관리자뷰');
    });
  });
});
