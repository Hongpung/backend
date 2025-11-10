import { describe, expect, it } from '@jest/globals';
import type { EnRole } from 'src/role/role.type';
import { SessionLogPrismaMapper } from './session-log.prisma.mapper';
import type { SessionDetailRow } from './session-log.prisma.mapper';

describe('SessionLogPrismaMapper', () => {
  const creator = {
    name: '홍길동',
    nickname: '길동',
  };

  const sessionCore = {
    sessionId: 10,
    creatorId: 1,
    date: new Date('2026-04-15T00:00:00.000Z'),
    startTime: new Date('1970-01-01T10:00:00.000Z'),
    endTime: new Date('1970-01-01T12:00:00.000Z'),
    sessionType: 'REGULAR',
    participationAvailable: true,
    reservationId: 99,
    forceEnd: false,
    reservationType: 'REGULAR',
    title: '연습',
    extendCount: 0,
    returnImageUrl: null,
  };

  describe('toMemberClubId', () => {
    it('clubId를 그대로 반환한다', () => {
      expect(SessionLogPrismaMapper.toMemberClubId({ clubId: 3 })).toEqual({
        clubId: 3,
      });
    });

    it('clubId가 null이면 null을 유지한다', () => {
      expect(SessionLogPrismaMapper.toMemberClubId({ clubId: null })).toEqual({
        clubId: null,
      });
    });
  });

  describe('toAdminSessionCalendarDayReadModel', () => {
    it('groupBy 행을 날짜 문자열·세션 수 read model로 변환한다', () => {
      const date = new Date('2026-04-01T00:00:00.000Z');

      expect(
        SessionLogPrismaMapper.toAdminSessionCalendarDayReadModel({
          date,
          _count: { _all: 4 },
        }),
      ).toEqual({
        date: '2026-04-01',
        sessionCount: 4,
      });
    });
  });

  describe('toSessionLogListItemFromAttendance', () => {
    it('출석 행에서 목록 read model을 포맷한다', () => {
      const result = SessionLogPrismaMapper.toSessionLogListItemFromAttendance({
        session: {
          ...sessionCore,
          externalCreatorName: null,
          creator,
          _count: { attendanceList: 5 },
        },
      } as Parameters<
        typeof SessionLogPrismaMapper.toSessionLogListItemFromAttendance
      >[0]);

      expect(result).toEqual({
        sessionId: 10,
        creatorId: 1,
        creatorName: '홍길동',
        creatorNickname: '길동',
        title: '연습',
        date: '2026-04-15',
        startTime: '10:00',
        endTime: '12:00',
        sessionType: 'REGULAR',
        reservationType: 'REGULAR',
        participationAvailable: true,
        forceEnd: false,
        attendeeCount: 5,
      });
    });
  });

  describe('toSessionLogListItemFromSession', () => {
    it('세션 요약에서 목록 read model을 포맷한다', () => {
      const result = SessionLogPrismaMapper.toSessionLogListItemFromSession({
        ...sessionCore,
        externalCreatorName: null,
        creator,
        _count: { attendanceList: 3 },
      } as Parameters<
        typeof SessionLogPrismaMapper.toSessionLogListItemFromSession
      >[0]);

      expect(result.sessionId).toBe(10);
      expect(result.startTime).toBe('10:00');
      expect(result.endTime).toBe('12:00');
      expect(result.attendeeCount).toBe(3);
    });
  });

  describe('toSessionLogDetailReadModel', () => {
    const detailRow = {
      ...sessionCore,
      externalCreatorName: null,
      creator,
      attendanceList: [
        {
          member: {
            memberId: 2,
            name: '김철수',
            nickname: '철수',
            blogUrl: null,
            club: { clubName: '풍물' },
            enrollmentNumber: '20240001',
            profileImageUrl: null,
            instagramUrl: null,
            roleAssignment: [{ role: 'LEADER' as EnRole }],
          },
          status: 'ATTEND',
          timeStamp: new Date('1970-01-01T09:30:00.000Z'),
        },
      ],
      borrowInstruments: [
        {
          instrumentSnapshot: {},
          instrument: {
            imageUrl: 'https://example.com/buk.png',
            name: '북',
            instrumentType: 'BUK',
            club: { clubName: '풍물' },
          },
        },
      ],
    } as SessionDetailRow;

    it('세션 상세 read model을 포맷한다', () => {
      const result =
        SessionLogPrismaMapper.toSessionLogDetailReadModel(detailRow);

      expect(result.sessionId).toBe(10);
      expect(result.startTime).toBe('10:00');
      expect(result.attendeeCount).toBe(1);
      expect(result.attendanceList).toHaveLength(1);
      expect(result.attendanceList[0].member.club).toBe('풍물');
      expect(result.attendanceList[0].member.role).toEqual(['패짱']);
      expect(result.attendanceList[0].timeStamp).toBe('09:30');
      expect(result.borrowInstruments[0].club).toBe('풍물');
    });

    it('member.club·instrument.club가 없으면 club 필드를 생략한다', () => {
      const result = SessionLogPrismaMapper.toSessionLogDetailReadModel({
        ...detailRow,
        attendanceList: [
          {
            ...detailRow.attendanceList[0],
            member: {
              ...detailRow.attendanceList[0].member,
              club: null,
            },
          },
        ],
        borrowInstruments: [
          {
            instrumentSnapshot: {},
            instrument: {
              ...detailRow.borrowInstruments[0].instrument,
              club: null,
            },
          },
        ],
      } as SessionDetailRow);

      expect(result.attendanceList[0].member.club).toBeUndefined();
      expect(result.borrowInstruments[0].club).toBeUndefined();
    });

    it('instrument이 없으면 instrumentSnapshot JSON을 사용한다', () => {
      const result = SessionLogPrismaMapper.toSessionLogDetailReadModel({
        ...detailRow,
        borrowInstruments: [
          {
            instrumentId: 1,
            instrumentSnapshot: {
              name: '스냅샷 북',
              instrumentType: 'BUK',
              imageUrl: null,
              club: '풍물',
            },
            instrument: null,
          },
        ],
      } as unknown as SessionDetailRow);

      expect(result.borrowInstruments[0]).toEqual({
        imageUrl: null,
        name: '스냅샷 북',
        instrumentType: 'BUK',
        club: '풍물',
      });
    });
  });

  describe('external creator', () => {
    it('creator가 없으면 externalCreatorName을 표시 이름으로 쓴다', () => {
      const result = SessionLogPrismaMapper.toSessionLogListItemFromSession({
        ...sessionCore,
        creatorId: null,
        externalCreatorName: '외부 단체',
        creator: null,
        _count: { attendanceList: 0 },
      } as Parameters<
        typeof SessionLogPrismaMapper.toSessionLogListItemFromSession
      >[0]);

      expect(result.creatorName).toBe('외부 단체');
      expect(result.creatorNickname).toBeNull();
    });
  });

  describe('toAdminSessionLogDetailReadModel', () => {
    it('관리자 상세 read model을 포맷한다', () => {
      const detailRow = {
        ...sessionCore,
        externalCreatorName: null,
        creator,
        attendanceList: [],
        borrowInstruments: [],
      } as SessionDetailRow;

      const result =
        SessionLogPrismaMapper.toAdminSessionLogDetailReadModel(detailRow);

      expect(result.sessionId).toBe(10);
      expect(result.creatorName).toBe('홍길동');
      expect(result.date).toBe('2026-04-15');
      expect(result.startTime).toBe('10:00');
      expect(result.endTime).toBe('12:00');
    });
  });
});
