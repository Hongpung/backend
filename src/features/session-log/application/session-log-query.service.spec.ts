import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { SessionLogQueryService } from './session-log-query.service';
import type { SessionLogRepositoryPort } from './ports/out/session-log.repository.port';
import type {
  SessionLogDetailReadModel,
  SessionLogListItemReadModel,
} from '../domain/read-models/session-log.read-model';

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

function listItemFixture(
  overrides: Partial<SessionLogListItemReadModel> = {},
): SessionLogListItemReadModel {
  return {
    sessionId: 1,
    creatorId: 100,
    creatorName: '홍',
    creatorNickname: 'nick',
    date: '2026-06-10',
    startTime: '10:00',
    endTime: '12:00',
    sessionType: 'RESERVED',
    participationAvailable: true,
    reservationType: 'REGULAR',
    title: '연습',
    forceEnd: false,
    attendeeCount: 0,
    ...overrides,
  };
}

function detailFixture(
  overrides: Partial<SessionLogDetailReadModel> = {},
): SessionLogDetailReadModel {
  return {
    ...listItemFixture(),
    extendCount: 0,
    returnImageUrl: null,
    reservationId: 5,
    attendanceList: [],
    borrowInstruments: [],
    ...overrides,
  };
}

describe('SessionLogQueryService', () => {
  let service: SessionLogQueryService;
  let repository: jest.Mocked<SessionLogRepositoryPort>;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new SessionLogQueryService(repository);
  });

  describe('getUserMonthlySessionLogs', () => {
    it('유효하지 않은 memberId면 BadRequestException', async () => {
      await expect(
        service.getUserMonthlySessionLogs({
          memberId: 0,
          year: 2024,
          month: 1,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.findUserMonthlyAttendances).not.toHaveBeenCalled();
    });

    it('month가 1~12 범위 밖이면 호출하지 않는다', async () => {
      await expect(
        service.getUserMonthlySessionLogs({
          memberId: 1,
          year: 2024,
          month: 13,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.findUserMonthlyAttendances).not.toHaveBeenCalled();
    });

    it('시작·종료 날짜 범위로 조회하고 목록을 반환한다', async () => {
      const row = listItemFixture({
        sessionId: 99,
        creatorId: 2,
        creatorName: 'A',
        creatorNickname: null,
        title: '세션',
        date: '2026-06-15',
        startTime: '14:00',
        endTime: '18:00',
        sessionType: 'RESERVED',
        reservationType: 'REGULAR',
        participationAvailable: true,
        forceEnd: false,
      });
      repository.findUserMonthlyAttendances.mockResolvedValue([row]);

      const result = await service.getUserMonthlySessionLogs({
        memberId: 1,
        year: 2024,
        month: 6,
      });

      const expectedStart = AppKstDateTime.dateFormmatForDB('2024-06-01');
      const expectedEnd = AppKstDateTime.dateFormmatForDB('2024-06-30');
      expect(repository.findUserMonthlyAttendances).toHaveBeenCalledWith(
        1,
        expectedStart,
        expectedEnd,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        sessionId: 99,
        creatorId: 2,
        creatorName: 'A',
        creatorNickname: null,
        title: '세션',
        date: '2026-06-15',
        startTime: '14:00',
        endTime: '18:00',
        sessionType: 'RESERVED',
        reservationType: 'REGULAR',
        participationAvailable: true,
        forceEnd: false,
        attendeeCount: 0,
      });
    });
  });

  describe('getClubMonthlySessionLogs', () => {
    it('동아리 미가입이면 BadRequestException', async () => {
      repository.findMemberClubId.mockResolvedValue({ clubId: null });

      await expect(
        service.getClubMonthlySessionLogs({
          memberId: 1,
          year: 2024,
          month: 1,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.findClubMonthlySessions).not.toHaveBeenCalled();
    });

    it('clubId가 0이어도 동아리 소속으로 조회한다', async () => {
      repository.findMemberClubId.mockResolvedValue({ clubId: 0 });
      repository.findClubMonthlySessions.mockResolvedValue([]);

      await service.getClubMonthlySessionLogs({
        memberId: 3,
        year: 2024,
        month: 1,
      });

      expect(repository.findClubMonthlySessions).toHaveBeenCalledWith(
        0,
        'REGULAR',
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('clubId로 REGULAR 월별 세션을 조회한다', async () => {
      repository.findMemberClubId.mockResolvedValue({ clubId: 10 });
      repository.findClubMonthlySessions.mockResolvedValue([
        listItemFixture({ sessionId: 7, title: '클럽연습' }),
      ]);

      const result = await service.getClubMonthlySessionLogs({
        memberId: 3,
        year: 2024,
        month: 6,
      });

      const expectedStart = AppKstDateTime.dateFormmatForDB('2024-06-01');
      const expectedEnd = AppKstDateTime.dateFormmatForDB('2024-06-30');
      expect(repository.findClubMonthlySessions).toHaveBeenCalledWith(
        10,
        'REGULAR',
        expectedStart,
        expectedEnd,
      );
      expect(result[0].sessionId).toBe(7);
      expect(result[0].title).toBe('클럽연습');
    });
  });

  describe('getSessionInfoBySessionId', () => {
    it('sessionId가 유효하지 않으면 BadRequestException', async () => {
      await expect(
        service.getSessionInfoBySessionId({ sessionId: -1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.findSessionBySessionId).not.toHaveBeenCalled();
    });

    it('세션이 없으면 null', async () => {
      repository.findSessionBySessionId.mockResolvedValue(null);

      await expect(
        service.getSessionInfoBySessionId({ sessionId: 1 }),
      ).resolves.toBeNull();
    });

    it('repository read model을 그대로 반환한다', async () => {
      const detail = detailFixture({
        sessionId: 42,
        attendanceList: [
          {
            member: {
              memberId: 9,
              name: '멤버',
              nickname: null,
              blogUrl: null,
              club: '북타',
              enrollmentNumber: '21',
              profileImageUrl: null,
              instagramUrl: null,
              role: ['패짱'],
            },
            status: 'ATTENDED',
            timeStamp: '09:30',
          },
        ],
        borrowInstruments: [
          {
            imageUrl: null,
            name: '북',
            instrumentType: 'BUK',
            club: '북타',
          },
        ],
      });
      repository.findSessionBySessionId.mockResolvedValue(detail);

      const result = await service.getSessionInfoBySessionId({
        sessionId: 42,
      });

      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe(42);
      expect(result!.attendanceList).toHaveLength(1);
      expect(result!.attendanceList[0].member.club).toBe('북타');
      expect(result!.attendanceList[0].member.role).toEqual(['패짱']);
      expect(result!.attendanceList[0].timeStamp).toBe('09:30');
      expect(result!.borrowInstruments[0].club).toBe('북타');
    });
  });

  describe('getSessionInfoByReservationId', () => {
    it('reservationId가 유효하지 않으면 BadRequestException', async () => {
      await expect(
        service.getSessionInfoByReservationId({ reservationId: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.findSessionByReservationId).not.toHaveBeenCalled();
    });
  });
});
