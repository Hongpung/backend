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

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const SESSION_DATE_YMD = '2031-06-15';
const RESERVED_DATE_YMD = '2031-06-16';

describeIntegration('SessionLogCommandPrismaRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: SessionLogCommandPrismaRepository;

  const runId = Date.now();
  let testClubId: number;
  let creatorMemberId: number;
  let attendeeMemberId1: number;
  let attendeeMemberId2: number;
  let testInstrumentId: number;
  let reservedReservationId: number;
  let reservedReservationId2: number;

  const trackedSessionIds: number[] = [];

  const email = (suffix: string) =>
    `session-log-cmd-int-${runId}-${suffix}@integration.test`;

  const nextRuntimeSessionId = () => randomUUID();

  const trackSession = (sessionId: number) => {
    if (!trackedSessionIds.includes(sessionId)) {
      trackedSessionIds.push(sessionId);
    }
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
    repository = new SessionLogCommandPrismaRepository(
      prisma as unknown as PrismaService,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 51_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `session-log-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const creator = await prisma.member.create({
      data: {
        email: email('creator'),
        password: 'pw',
        name: '세션생성자',
        nickname: '생성자닉',
        enrollmentNumber: `session-log-int-${runId}-cr`,
        clubId: testClubId,
      },
    });
    creatorMemberId = creator.memberId;

    const attendee1 = await prisma.member.create({
      data: {
        email: email('attendee-1'),
        password: 'pw',
        name: '출석자1',
        enrollmentNumber: `session-log-int-${runId}-a1`,
        clubId: testClubId,
      },
    });
    attendeeMemberId1 = attendee1.memberId;

    const attendee2 = await prisma.member.create({
      data: {
        email: email('attendee-2'),
        password: 'pw',
        name: '출석자2',
        enrollmentNumber: `session-log-int-${runId}-a2`,
        clubId: testClubId,
      },
    });
    attendeeMemberId2 = attendee2.memberId;

    await prisma.roleAssignment.create({
      data: {
        clubId: testClubId,
        memberId: creatorMemberId,
        role: 'SANGSOE',
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
        title: `session-log-reserved-${runId}`,
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
        title: `session-log-reserved-2-${runId}`,
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
          in: [creatorMemberId, attendeeMemberId1, attendeeMemberId2],
        },
      },
    });
    await prisma.club.delete({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('SL-I01 persistSessionFromSnapshot — 최초 insert', () => {
    it('REALTIME 스냅샷을 insert하고 mapping·출석·대여·read model을 반환한다', async () => {
      const runtimeSessionId = nextRuntimeSessionId();
      const payload = buildPersistCommand({
        runtimeSessionId,
        sessionType: 'REALTIME',
        reservationId: null,
        reservationType: null,
      });

      const detail = await repository.persistSessionFromSnapshot(payload);
      trackSession(detail.sessionId);

      const mapping = await prisma.sessionRuntimeMapping.findUnique({
        where: { runtimeSessionId },
      });
      expect(mapping).not.toBeNull();
      expect(mapping!.sessionId).toBe(detail.sessionId);

      const attendanceRows = await prisma.attendance.findMany({
        where: { sessionId: detail.sessionId },
        orderBy: { memberId: 'asc' },
      });
      expect(attendanceRows).toHaveLength(2);
      expect(attendanceRows.map((row) => row.memberId)).toEqual([
        attendeeMemberId1,
        attendeeMemberId2,
      ]);

      const borrowRows = await prisma.borrowedInstrument.findMany({
        where: { sessionId: detail.sessionId },
      });
      expect(borrowRows).toHaveLength(1);
      expect(borrowRows[0]!.instrumentId).toBe(testInstrumentId);

      expect(detail.sessionId).toBeGreaterThan(0);
      expect(detail.sessionType).toBe('REALTIME');
      expect(detail.reservationId).toBeNull();
      expect(detail.title).toBe(payload.title);
      expect(detail.date).toBe(SESSION_DATE_YMD);
      expect(detail.startTime).toBe('14:00');
      expect(detail.endTime).toBe('16:00');
      expect(detail.attendanceList).toHaveLength(2);
      expect(detail.attendanceList[0]!.member.memberId).toBe(attendeeMemberId1);
      expect(detail.borrowInstruments).toHaveLength(1);
      expect(detail.borrowInstruments[0]!.name).toBe('통합테스트 북');
      expect(detail.borrowInstruments[0]!.instrumentType).toBe('BUK');
      expect(detail.borrowInstruments[0]!.club).toBe(
        `session-log-int-club-${testClubId}`,
      );
    });

    it('RESERVED 스냅샷은 reservationId FK와 함께 insert한다', async () => {
      const runtimeSessionId = nextRuntimeSessionId();
      const payload = buildPersistCommand({
        runtimeSessionId,
        sessionType: 'RESERVED',
        reservationType: 'REGULAR',
        reservationId: reservedReservationId,
        date: AppKstDateTime.dateFormmatForDB(RESERVED_DATE_YMD),
      });

      const detail = await repository.persistSessionFromSnapshot(payload);
      trackSession(detail.sessionId);

      const sessionRow = await prisma.session.findUnique({
        where: { sessionId: detail.sessionId },
      });
      expect(sessionRow!.sessionType).toBe('RESERVED');
      expect(sessionRow!.reservationId).toBe(reservedReservationId);
      expect(sessionRow!.reservationType).toBe('REGULAR');

      expect(detail.sessionType).toBe('RESERVED');
      expect(detail.reservationId).toBe(reservedReservationId);
      expect(detail.reservationType).toBe('REGULAR');
      expect(detail.date).toBe(RESERVED_DATE_YMD);
    });

    it('DB row와 read model의 출석·대여 shape가 일치한다', async () => {
      const runtimeSessionId = nextRuntimeSessionId();
      const payload = buildPersistCommand({ runtimeSessionId });

      const detail = await repository.persistSessionFromSnapshot(payload);
      trackSession(detail.sessionId);

      const attendanceRows = await prisma.attendance.findMany({
        where: { sessionId: detail.sessionId },
      });
      const borrowRows = await prisma.borrowedInstrument.findMany({
        where: { sessionId: detail.sessionId },
      });

      expect(attendanceRows).toHaveLength(detail.attendanceList.length);
      expect(borrowRows).toHaveLength(detail.borrowInstruments.length);

      for (const attendance of detail.attendanceList) {
        expect(attendance.member.name).toBeTruthy();
        expect(attendance.member.enrollmentNumber).toBeTruthy();
        expect(['출석', '지각']).toContain(attendance.status);
        expect(attendance.timeStamp).toMatch(/^\d{2}:\d{2}$/);
      }

      expect(detail.borrowInstruments[0]).toEqual(
        expect.objectContaining({
          name: '통합테스트 북',
          instrumentType: 'BUK',
          imageUrl: 'https://cdn.test/buk.png',
        }),
      );
      expect(detail.attendeeCount).toBe(2);
    });
  });

  describe('SL-I02 persistSessionFromSnapshot — 멱등·동시성', () => {
    it('동일 runtimeSessionId 재-persist 시 sessionId를 유지하고 필드·출석을 동기화한다', async () => {
      const runtimeSessionId = nextRuntimeSessionId();
      const initial = buildPersistCommand({ runtimeSessionId });

      const first = await repository.persistSessionFromSnapshot(initial);
      trackSession(first.sessionId);

      const updatedEndTime = AppKstDateTime.timeFormmatForDB('17:30');
      const updatedStamp = AppKstDateTime.getNowKoreanTime();
      const second = await repository.persistSessionFromSnapshot({
        ...initial,
        endTime: updatedEndTime,
        extendCount: 2,
        forceEnd: true,
        returnImageUrl: ['https://cdn.test/return.jpg'],
        attendanceList: [
          {
            memberId: attendeeMemberId1,
            status: '결석',
            timeStamp: updatedStamp,
          },
        ],
      });

      expect(second.sessionId).toBe(first.sessionId);
      expect(second.endTime).toBe('17:30');
      expect(second.extendCount).toBe(2);
      expect(second.forceEnd).toBe(true);
      expect(second.returnImageUrl).toEqual(['https://cdn.test/return.jpg']);
      expect(second.attendanceList).toHaveLength(1);
      expect(second.attendanceList[0]!.status).toBe('결석');

      const attendanceRows = await prisma.attendance.findMany({
        where: { sessionId: first.sessionId },
      });
      expect(attendanceRows).toHaveLength(1);
      expect(attendanceRows[0]!.memberId).toBe(attendeeMemberId1);
      expect(attendanceRows[0]!.status).toBe('결석');

      const sessionCount = await prisma.session.count({
        where: { sessionId: first.sessionId },
      });
      expect(sessionCount).toBe(1);
    });

    it('다른 runtimeSessionId지만 동일 reservationId면 P2002 없이 기존 session을 갱신한다', async () => {
      const runtimeSessionIdA = nextRuntimeSessionId();
      const firstPayload = buildPersistCommand({
        runtimeSessionId: runtimeSessionIdA,
        sessionType: 'RESERVED',
        reservationType: 'REGULAR',
        reservationId: reservedReservationId2,
        date: AppKstDateTime.dateFormmatForDB(RESERVED_DATE_YMD),
      });

      const first = await repository.persistSessionFromSnapshot(firstPayload);
      trackSession(first.sessionId);

      const runtimeSessionIdB = nextRuntimeSessionId();
      const secondPayload = {
        ...firstPayload,
        runtimeSessionId: runtimeSessionIdB,
        extendCount: 1,
        title: `session-log-updated-${runId}`,
      };

      const second = await repository.persistSessionFromSnapshot(secondPayload);

      expect(second.sessionId).toBe(first.sessionId);
      expect(second.extendCount).toBe(1);
      expect(second.title).toBe(first.title);

      const mappingCount = await prisma.sessionRuntimeMapping.count({
        where: { sessionId: first.sessionId },
      });
      expect(mappingCount).toBe(1);

      const mapping = await prisma.sessionRuntimeMapping.findUnique({
        where: { runtimeSessionId: runtimeSessionIdA },
      });
      expect(mapping!.sessionId).toBe(first.sessionId);
    });

    it('동일 payload 병렬 persist 시 session row는 1개만 생성된다', async () => {
      const runtimeSessionId = nextRuntimeSessionId();
      const payload = buildPersistCommand({ runtimeSessionId });

      const results = await Promise.allSettled([
        repository.persistSessionFromSnapshot(payload),
        repository.persistSessionFromSnapshot(payload),
        repository.persistSessionFromSnapshot(payload),
      ]);

      const fulfilled = results.filter(
        (result): result is PromiseFulfilledResult<
          Awaited<ReturnType<typeof repository.persistSessionFromSnapshot>>
        > => result.status === 'fulfilled',
      );
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      const sessionIds = new Set(fulfilled.map((row) => row.value.sessionId));
      expect(sessionIds.size).toBe(1);
      trackSession(fulfilled[0]!.value.sessionId);

      const mapping = await prisma.sessionRuntimeMapping.findUnique({
        where: { runtimeSessionId },
      });
      expect(mapping).not.toBeNull();

      const sessionCount = await prisma.session.count({
        where: { sessionId: mapping!.sessionId },
      });
      expect(sessionCount).toBe(1);

      const mappingCount = await prisma.sessionRuntimeMapping.count({
        where: { runtimeSessionId },
      });
      expect(mappingCount).toBe(1);
    });

    it('재-persist 시 borrowInstruments row는 갱신되지 않는다', async () => {
      const runtimeSessionId = nextRuntimeSessionId();
      const initial = buildPersistCommand({ runtimeSessionId });

      const first = await repository.persistSessionFromSnapshot(initial);
      trackSession(first.sessionId);

      const borrowBefore = await prisma.borrowedInstrument.findMany({
        where: { sessionId: first.sessionId },
      });
      expect(borrowBefore).toHaveLength(1);

      await repository.persistSessionFromSnapshot({
        ...initial,
        borrowInstruments: [],
        attendanceList: [
          {
            memberId: attendeeMemberId1,
            status: '출석',
            timeStamp: AppKstDateTime.getNowKoreanTime(),
          },
        ],
      });

      const borrowAfter = await prisma.borrowedInstrument.findMany({
        where: { sessionId: first.sessionId },
      });
      expect(borrowAfter).toHaveLength(1);
      expect(borrowAfter[0]!.borrowedInstrumentId).toBe(
        borrowBefore[0]!.borrowedInstrumentId,
      );
      expect(borrowAfter[0]!.instrumentId).toBe(testInstrumentId);
    });
  });

  describe('SL-I03 deleteByRuntimeSessionId', () => {
    it('mapping이 있으면 true를 반환하고 session·mapping·출석·대여가 cascade 삭제된다', async () => {
      const runtimeSessionId = nextRuntimeSessionId();
      const payload = buildPersistCommand({ runtimeSessionId });

      const detail = await repository.persistSessionFromSnapshot(payload);

      const deleted = await repository.deleteByRuntimeSessionId(runtimeSessionId);
      expect(deleted).toBe(true);

      const sessionRow = await prisma.session.findUnique({
        where: { sessionId: detail.sessionId },
      });
      expect(sessionRow).toBeNull();

      const mappingRow = await prisma.sessionRuntimeMapping.findUnique({
        where: { runtimeSessionId },
      });
      expect(mappingRow).toBeNull();

      const attendanceCount = await prisma.attendance.count({
        where: { sessionId: detail.sessionId },
      });
      expect(attendanceCount).toBe(0);

      const borrowCount = await prisma.borrowedInstrument.count({
        where: { sessionId: detail.sessionId },
      });
      expect(borrowCount).toBe(0);
    });

    it('존재하지 않는 runtimeSessionId면 false를 반환한다', async () => {
      const deleted = await repository.deleteByRuntimeSessionId(randomUUID());
      expect(deleted).toBe(false);
    });

    it('RESERVED session 삭제 후에도 reservation row는 유지된다', async () => {
      const reservation = await prisma.reservation.create({
        data: {
          date: AppKstDateTime.dateFormmatForDB('2031-06-17'),
          startTime: AppKstDateTime.timeFormmatForDB('18:00'),
          endTime: AppKstDateTime.timeFormmatForDB('20:00'),
          title: `session-log-delete-reserved-${runId}`,
          reservationType: 'REGULAR',
          participationAvailable: true,
          creatorId: creatorMemberId,
        },
      });

      const runtimeSessionId = nextRuntimeSessionId();
      const payload = buildPersistCommand({
        runtimeSessionId,
        sessionType: 'RESERVED',
        reservationType: 'REGULAR',
        reservationId: reservation.reservationId,
        date: AppKstDateTime.dateFormmatForDB('2031-06-17'),
      });

      await repository.persistSessionFromSnapshot(payload);

      const deleted = await repository.deleteByRuntimeSessionId(runtimeSessionId);
      expect(deleted).toBe(true);

      const reservationRow = await prisma.reservation.findUnique({
        where: { reservationId: reservation.reservationId },
      });
      expect(reservationRow).not.toBeNull();

      await prisma.reservation.delete({
        where: { reservationId: reservation.reservationId },
      });
    });
  });
});
