import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { PersistSessionLogCommand } from '../../../application/commands/persist-session-log.command';
import { SessionLogCommandPrismaRepository } from './session-log-command.prisma.repository';
import { SessionLogPrismaRepository } from './session-log.prisma.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const SESSION_DATE_YMD = '2031-06-15';
const RESERVED_DATE_YMD = '2031-06-16';

function monthDateRangeForDb(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate();
  return {
    startDate: AppKstDateTime.dateFormmatForDB(
      `${year}-${String(month).padStart(2, '0')}-01`,
    ),
    endDate: AppKstDateTime.dateFormmatForDB(
      `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    ),
  };
}

describeIntegration('SessionLogPrismaRepository (통합)', () => {
  let prisma: PrismaClient;
  let commandRepo: SessionLogCommandPrismaRepository;
  let queryRepo: SessionLogPrismaRepository;

  const runId = Date.now();
  let testClubId: number;
  let creatorMemberId: number;
  let attendeeMemberId1: number;
  let attendeeMemberId2: number;
  let memberWithoutAttendanceId: number;
  let testInstrumentId: number;
  let reservedReservationId: number;
  let reservedReservationId2: number;

  const trackedSessionIds: number[] = [];

  const email = (suffix: string) =>
    `session-log-query-int-${runId}-${suffix}@integration.test`;

  const nextRuntimeSessionId = () => randomUUID();

  const trackSession = (sessionId: number) => {
    if (!trackedSessionIds.includes(sessionId)) {
      trackedSessionIds.push(sessionId);
    }
  };

  const persistAndTrack = async (overrides: Partial<PersistSessionLogCommand> = {}) => {
    const detail = await commandRepo.persistSessionFromSnapshot(
      buildPersistCommand(overrides),
    );
    trackSession(detail.sessionId);
    return detail;
  };

  const buildPersistCommand = (
    overrides: Partial<PersistSessionLogCommand> = {},
  ): PersistSessionLogCommand => {
    const attendanceStamp = AppKstDateTime.getNowKoreanTime();

    return {
      runtimeSessionId: nextRuntimeSessionId(),
      date: AppKstDateTime.dateFormmatForDB(SESSION_DATE_YMD),
      startTime: AppKstDateTime.timeFormmatForDB('14:00'),
      endTime: AppKstDateTime.timeFormmatForDB('16:00'),
      creatorId: creatorMemberId,
      title: `session-log-int-${runId}`,
      sessionType: 'REALTIME',
      reservationType: null,
      reservationId: null,
      extendCount: 0,
      participationAvailable: true,
      returnImageUrl: null,
      forceEnd: false,
      attendanceList: [
        {
          memberId: attendeeMemberId1,
          status: '출석',
          timeStamp: attendanceStamp,
        },
        {
          memberId: attendeeMemberId2,
          status: '지각',
          timeStamp: attendanceStamp,
        },
      ],
      borrowInstruments: [
        {
          instrumentId: testInstrumentId,
          instrumentSnapshot: JSON.stringify({
            name: '통합테스트 북',
            instrumentType: 'BUK',
          }),
        },
      ],
      ...overrides,
    };
  };

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    commandRepo = new SessionLogCommandPrismaRepository(
      prisma as unknown as PrismaService,
    );
    queryRepo = new SessionLogPrismaRepository(prisma as unknown as PrismaService);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 52_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `session-log-query-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const creator = await prisma.member.create({
      data: {
        email: email('creator'),
        password: 'pw',
        name: '세션생성자',
        nickname: '생성자닉',
        enrollmentNumber: `session-log-query-int-${runId}-cr`,
        clubId: testClubId,
      },
    });
    creatorMemberId = creator.memberId;

    const attendee1 = await prisma.member.create({
      data: {
        email: email('attendee-1'),
        password: 'pw',
        name: '출석자1',
        enrollmentNumber: `session-log-query-int-${runId}-a1`,
        clubId: testClubId,
      },
    });
    attendeeMemberId1 = attendee1.memberId;

    const attendee2 = await prisma.member.create({
      data: {
        email: email('attendee-2'),
        password: 'pw',
        name: '출석자2',
        enrollmentNumber: `session-log-query-int-${runId}-a2`,
        clubId: testClubId,
      },
    });
    attendeeMemberId2 = attendee2.memberId;

    const noAttendanceMember = await prisma.member.create({
      data: {
        email: email('no-attendance'),
        password: 'pw',
        name: '미출석자',
        enrollmentNumber: `session-log-query-int-${runId}-na`,
        clubId: testClubId,
      },
    });
    memberWithoutAttendanceId = noAttendanceMember.memberId;

    await prisma.roleAssignment.create({
      data: {
        clubId: testClubId,
        memberId: creatorMemberId,
        role: 'SANGSOE',
      },
    });

    await prisma.roleAssignment.create({
      data: {
        clubId: testClubId,
        memberId: attendeeMemberId1,
        role: 'LEADER',
      },
    });

    const instrument = await prisma.instrument.create({
      data: {
        instrumentType: 'BUK',
        clubId: testClubId,
        name: '통합테스트 북',
        imageUrl: 'https://cdn.test/buk.png',
        borrowAvailable: true,
      },
    });
    testInstrumentId = instrument.instrumentId;

    const reservation = await prisma.reservation.create({
      data: {
        date: AppKstDateTime.dateFormmatForDB(RESERVED_DATE_YMD),
        startTime: AppKstDateTime.timeFormmatForDB('10:00'),
        endTime: AppKstDateTime.timeFormmatForDB('12:00'),
        title: `session-log-query-reserved-${runId}`,
        reservationType: 'REGULAR',
        participationAvailable: true,
        creatorId: creatorMemberId,
      },
    });
    reservedReservationId = reservation.reservationId;

    const reservation2 = await prisma.reservation.create({
      data: {
        date: AppKstDateTime.dateFormmatForDB(RESERVED_DATE_YMD),
        startTime: AppKstDateTime.timeFormmatForDB('13:00'),
        endTime: AppKstDateTime.timeFormmatForDB('15:00'),
        title: `session-log-query-reserved-2-${runId}`,
        reservationType: 'REGULAR',
        participationAvailable: true,
        creatorId: creatorMemberId,
      },
    });
    reservedReservationId2 = reservation2.reservationId;
  });

  afterEach(async () => {
    if (!prisma || trackedSessionIds.length === 0) return;

    await prisma.session.deleteMany({
      where: { sessionId: { in: [...trackedSessionIds] } },
    });
    trackedSessionIds.length = 0;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.session.deleteMany({
      where: {
        OR: [
          { reservationId: { in: [reservedReservationId, reservedReservationId2] } },
          { creatorId: creatorMemberId },
        ],
      },
    });
    await prisma.reservation.deleteMany({
      where: {
        reservationId: { in: [reservedReservationId, reservedReservationId2] },
      },
    });
    await prisma.instrument.deleteMany({
      where: { instrumentId: testInstrumentId },
    });
    await prisma.roleAssignment.deleteMany({ where: { clubId: testClubId } });
    await prisma.member.deleteMany({
      where: {
        memberId: {
          in: [
            creatorMemberId,
            attendeeMemberId1,
            attendeeMemberId2,
            memberWithoutAttendanceId,
          ],
        },
      },
    });
    await prisma.club.delete({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('SL-I07 findUserMonthlyAttendances', () => {
    it('월 범위 내 출석 세션 목록 read model을 반환한다', async () => {
      const detail = await persistAndTrack();

      const { startDate, endDate } = monthDateRangeForDb(2031, 6);
      const results = await queryRepo.findUserMonthlyAttendances(
        attendeeMemberId1,
        startDate,
        endDate,
      );

      const matched = results.find((row) => row.sessionId === detail.sessionId);
      expect(matched).toBeDefined();
      expect(matched).toEqual(
        expect.objectContaining({
          sessionId: detail.sessionId,
          title: `session-log-int-${runId}`,
          date: SESSION_DATE_YMD,
          startTime: '14:00',
          endTime: '16:00',
          sessionType: 'REALTIME',
          creatorName: '세션생성자',
          attendeeCount: 2,
        }),
      );
    });

    it('같은 멤버의 여러 출석과 월 경계(초일·말일) 세션을 포함한다', async () => {
      const first = await persistAndTrack({
        date: AppKstDateTime.dateFormmatForDB('2031-06-01'),
        startTime: AppKstDateTime.timeFormmatForDB('09:00'),
        endTime: AppKstDateTime.timeFormmatForDB('11:00'),
        attendanceList: [
          {
            memberId: attendeeMemberId1,
            status: '출석',
            timeStamp: AppKstDateTime.getNowKoreanTime(),
          },
        ],
      });
      const last = await persistAndTrack({
        date: AppKstDateTime.dateFormmatForDB('2031-06-30'),
        startTime: AppKstDateTime.timeFormmatForDB('18:00'),
        endTime: AppKstDateTime.timeFormmatForDB('20:00'),
        attendanceList: [
          {
            memberId: attendeeMemberId1,
            status: '출석',
            timeStamp: AppKstDateTime.getNowKoreanTime(),
          },
        ],
      });

      const { startDate, endDate } = monthDateRangeForDb(2031, 6);
      const results = await queryRepo.findUserMonthlyAttendances(
        attendeeMemberId1,
        startDate,
        endDate,
      );

      const sessionIds = results.map((row) => row.sessionId);
      expect(sessionIds).toEqual(
        expect.arrayContaining([first.sessionId, last.sessionId]),
      );
      expect(results.find((row) => row.date === '2031-06-01')).toBeDefined();
      expect(results.find((row) => row.date === '2031-06-30')).toBeDefined();
    });

    it('월 범위 밖 세션은 제외한다', async () => {
      const inRange = await persistAndTrack();
      const outOfRange = await persistAndTrack({
        date: AppKstDateTime.dateFormmatForDB('2031-07-01'),
        attendanceList: [
          {
            memberId: attendeeMemberId1,
            status: '출석',
            timeStamp: AppKstDateTime.getNowKoreanTime(),
          },
        ],
      });

      const { startDate, endDate } = monthDateRangeForDb(2031, 6);
      const results = await queryRepo.findUserMonthlyAttendances(
        attendeeMemberId1,
        startDate,
        endDate,
      );

      const sessionIds = results.map((row) => row.sessionId);
      expect(sessionIds).toContain(inRange.sessionId);
      expect(sessionIds).not.toContain(outOfRange.sessionId);
    });

    it('다른 멤버만 출석한 세션은 제외한다', async () => {
      const otherOnly = await persistAndTrack({
        attendanceList: [
          {
            memberId: attendeeMemberId2,
            status: '출석',
            timeStamp: AppKstDateTime.getNowKoreanTime(),
          },
        ],
      });

      const { startDate, endDate } = monthDateRangeForDb(2031, 6);
      const results = await queryRepo.findUserMonthlyAttendances(
        attendeeMemberId1,
        startDate,
        endDate,
      );

      expect(results.map((row) => row.sessionId)).not.toContain(
        otherOnly.sessionId,
      );
    });

    it('출석 기록이 없으면 빈 배열을 반환한다', async () => {
      const { startDate, endDate } = monthDateRangeForDb(2031, 6);
      const results = await queryRepo.findUserMonthlyAttendances(
        memberWithoutAttendanceId,
        startDate,
        endDate,
      );

      expect(results).toEqual([]);
    });
  });

  describe('SL-I07 findSessionBySessionId / findSessionByReservationId', () => {
    it('sessionId로 상세 read model과 nested 출석 role·대여 club·timeStamp HH:mm을 반환한다', async () => {
      const detail = await persistAndTrack();

      const found = await queryRepo.findSessionBySessionId(detail.sessionId);

      expect(found).not.toBeNull();
      expect(found!.sessionId).toBe(detail.sessionId);
      expect(found!.date).toBe(SESSION_DATE_YMD);
      expect(found!.attendanceList).toHaveLength(2);

      const attendee1 = found!.attendanceList.find(
        (row) => row.member.memberId === attendeeMemberId1,
      );
      expect(attendee1).toBeDefined();
      expect(attendee1!.status).toBe('출석');
      expect(attendee1!.timeStamp).toMatch(/^\d{2}:\d{2}$/);
      expect(attendee1!.member.role).toContain('패짱');

      expect(found!.borrowInstruments).toHaveLength(1);
      expect(found!.borrowInstruments[0]!.club).toBe(
        `session-log-query-int-club-${testClubId}`,
      );
      expect(found!.borrowInstruments[0]!.name).toBe('통합테스트 북');
    });

    it('reservationId lookup이 sessionId 조회와 동일한 상세 shape를 반환한다', async () => {
      const detail = await persistAndTrack({
        sessionType: 'RESERVED',
        reservationType: 'REGULAR',
        reservationId: reservedReservationId,
        date: AppKstDateTime.dateFormmatForDB(RESERVED_DATE_YMD),
      });

      const bySessionId = await queryRepo.findSessionBySessionId(detail.sessionId);
      const byReservationId = await queryRepo.findSessionByReservationId(
        reservedReservationId,
      );

      expect(byReservationId).not.toBeNull();
      expect(byReservationId!.sessionId).toBe(detail.sessionId);
      expect(byReservationId!.sessionType).toBe('RESERVED');
      expect(byReservationId!.reservationId).toBe(reservedReservationId);
      expect(byReservationId!.date).toBe(RESERVED_DATE_YMD);
      expect(byReservationId!.attendanceList).toHaveLength(
        bySessionId!.attendanceList.length,
      );
      expect(byReservationId!.borrowInstruments[0]!.club).toBe(
        bySessionId!.borrowInstruments[0]!.club,
      );
    });

    it('존재하지 않는 sessionId·reservationId는 null을 반환한다', async () => {
      const missingSessionId = 9_999_999_999;
      const missingReservationId = 9_999_999_999;

      await expect(
        queryRepo.findSessionBySessionId(missingSessionId),
      ).resolves.toBeNull();
      await expect(
        queryRepo.findSessionByReservationId(missingReservationId),
      ).resolves.toBeNull();
    });
  });

  describe('SL-I07 findAdminSessionCalendarForMonth', () => {
    it('월 내 날짜별 sessionCount를 date 오름차순으로 반환한다', async () => {
      await persistAndTrack({
        date: AppKstDateTime.dateFormmatForDB('2031-06-15'),
        startTime: AppKstDateTime.timeFormmatForDB('10:00'),
        endTime: AppKstDateTime.timeFormmatForDB('12:00'),
      });
      await persistAndTrack({
        date: AppKstDateTime.dateFormmatForDB('2031-06-15'),
        startTime: AppKstDateTime.timeFormmatForDB('13:00'),
        endTime: AppKstDateTime.timeFormmatForDB('15:00'),
      });
      await persistAndTrack({
        date: AppKstDateTime.dateFormmatForDB('2031-06-16'),
        startTime: AppKstDateTime.timeFormmatForDB('09:00'),
        endTime: AppKstDateTime.timeFormmatForDB('11:00'),
      });

      const calendar = await queryRepo.findAdminSessionCalendarForMonth(2031, 6);

      expect(calendar).toEqual([
        { date: '2031-06-15', sessionCount: 2 },
        { date: '2031-06-16', sessionCount: 1 },
      ]);
    });

    it('인접 월 세션은 집계에서 제외한다', async () => {
      const inMonth = await persistAndTrack({
        date: AppKstDateTime.dateFormmatForDB('2031-06-15'),
      });
      const prevMonth = await persistAndTrack({
        date: AppKstDateTime.dateFormmatForDB('2031-05-15'),
      });
      const nextMonth = await persistAndTrack({
        date: AppKstDateTime.dateFormmatForDB('2031-07-15'),
      });

      const calendar = await queryRepo.findAdminSessionCalendarForMonth(2031, 6);

      expect(calendar).toEqual([{ date: '2031-06-15', sessionCount: 1 }]);
      expect(calendar.map((row) => row.date)).not.toContain('2031-05-15');
      expect(calendar.map((row) => row.date)).not.toContain('2031-07-15');

      const prevMonthDetail = await queryRepo.findSessionBySessionId(
        prevMonth.sessionId,
      );
      const nextMonthDetail = await queryRepo.findSessionBySessionId(
        nextMonth.sessionId,
      );
      expect(prevMonthDetail!.date).toBe('2031-05-15');
      expect(nextMonthDetail!.date).toBe('2031-07-15');
      expect(inMonth.date).toBe('2031-06-15');
    });

    it('세션이 없는 월이면 빈 배열을 반환한다', async () => {
      const calendar = await queryRepo.findAdminSessionCalendarForMonth(2031, 8);
      expect(calendar).toEqual([]);
    });
  });

  describe('SL-I07 findAdminSessionLogsByDate', () => {
    it('동일 날짜 세션을 startTime 오름차순 admin detail로 반환한다', async () => {
      const early = await persistAndTrack({
        date: AppKstDateTime.dateFormmatForDB('2031-06-15'),
        startTime: AppKstDateTime.timeFormmatForDB('10:00'),
        endTime: AppKstDateTime.timeFormmatForDB('12:00'),
        title: `session-log-int-${runId}-early`,
      });
      const late = await persistAndTrack({
        date: AppKstDateTime.dateFormmatForDB('2031-06-15'),
        startTime: AppKstDateTime.timeFormmatForDB('14:00'),
        endTime: AppKstDateTime.timeFormmatForDB('16:00'),
        title: `session-log-int-${runId}-late`,
      });

      const logs = await queryRepo.findAdminSessionLogsByDate(
        AppKstDateTime.dateFormmatForDB('2031-06-15'),
      );

      const ours = logs.filter((row) =>
        row.title.startsWith(`session-log-int-${runId}`),
      );
      expect(ours.map((row) => row.sessionId)).toEqual([
        early.sessionId,
        late.sessionId,
      ]);
      expect(ours[0]!.startTime).toBe('10:00');
      expect(ours[1]!.startTime).toBe('14:00');
      expect(ours[0]!.creatorName).toBe('세션생성자');
      expect(ours[0]!.attendanceList.length).toBeGreaterThan(0);
    });

    it('해당 날짜에 세션이 없으면 빈 배열을 반환한다', async () => {
      const logs = await queryRepo.findAdminSessionLogsByDate(
        AppKstDateTime.dateFormmatForDB('2031-06-20'),
      );

      const ours = logs.filter((row) =>
        row.title.startsWith(`session-log-int-${runId}`),
      );
      expect(ours).toEqual([]);
    });
  });

  describe('SL-I07 findLatestSessions', () => {
    it('sessionId desc 최신 순으로 반환하고 runId title prefix로 필터 가능하다', async () => {
      const first = await persistAndTrack({
        title: `session-log-int-${runId}-latest-a`,
      });
      const second = await persistAndTrack({
        title: `session-log-int-${runId}-latest-b`,
      });
      const third = await persistAndTrack({
        title: `session-log-int-${runId}-latest-c`,
      });

      const latest = await queryRepo.findLatestSessions(0, 200);
      const ours = latest.filter((row) =>
        row.title.startsWith(`session-log-int-${runId}-latest`),
      );

      expect(ours.map((row) => row.sessionId)).toEqual([
        third.sessionId,
        second.sessionId,
        first.sessionId,
      ]);
      for (let i = 1; i < ours.length; i++) {
        expect(ours[i - 1]!.sessionId).toBeGreaterThan(ours[i]!.sessionId);
      }
    });
  });
});
