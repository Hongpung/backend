import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type {
  DiscardedReservationInstrumentSnapshot,
  DiscardedReservationMemberSnapshot,
  DiscardedReservationSnapshot,
} from 'src/features/discarded-reservation/domain/discarded-reservation.vo';
import { PrismaDiscardedReservationRepository } from './discarded-reservation.prisma.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const RESERVATION_DATE_YMD = '2030-08-20';
const SNAPSHOT_DATE_YMD = '2030-09-10';

describeIntegration('PrismaDiscardedReservationRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaDiscardedReservationRepository;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new PrismaDiscardedReservationRepository(
      prisma as unknown as PrismaService,
    );
  });

  afterAll(async () => {
    if (!prisma) return;
    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('session write path smoke', () => {
    const runId = Date.now();
    let reservationId: number;

    beforeAll(async () => {
      const reservation = await prisma.reservation.create({
        data: {
          date: AppKstDateTime.dateFormmatForDB(RESERVATION_DATE_YMD),
          startTime: AppKstDateTime.timeFormmatForDB('09:00'),
          endTime: AppKstDateTime.timeFormmatForDB('10:00'),
          title: `discard-smoke-${runId}`,
          reservationType: 'REGULAR',
          participationAvailable: true,
          creatorId: null,
          externalCreatorName: null,
        },
      });
      reservationId = reservation.reservationId;
    });

    afterAll(async () => {
      if (!prisma) return;

      await prisma.discardedReservation.deleteMany({
        where: { reservationId },
      });
      await prisma.reservation.delete({ where: { reservationId } });
    });

    it('saveNoShowByReservationId는 폐기 예약 row를 생성한다', async () => {
      await repository.saveNoShowByReservationId(reservationId);

      const row = await prisma.discardedReservation.findUnique({
        where: { reservationId },
      });

      expect(row).not.toBeNull();
      expect(row!.discardReason).toBe('NO_SHOW');
      expect(row!.discardedByType).toBe('SYSTEM');

      const snapshot = row!.reservationSnapshot as {
        title: string;
        date: string;
        startTime: string;
        endTime: string;
        policy: { graceMinutes: number };
      };
      expect(snapshot.title).toBe(`discard-smoke-${runId}`);
      expect(snapshot.date).toBe(RESERVATION_DATE_YMD);
      expect(snapshot.startTime).toBe('09:00');
      expect(snapshot.endTime).toBe('10:00');
      expect(snapshot.policy).toEqual({ graceMinutes: 10 });
    });

    it('재호출 시 동일 reservationId row를 갱신한다', async () => {
      await prisma.reservation.update({
        where: { reservationId },
        data: { title: `discard-smoke-updated-${runId}` },
      });

      await repository.saveNoShowByReservationId(reservationId);

      const rows = await prisma.discardedReservation.findMany({
        where: { reservationId },
      });
      expect(rows).toHaveLength(1);

      const snapshot = rows[0]!.reservationSnapshot as { title: string };
      expect(snapshot.title).toBe(`discard-smoke-updated-${runId}`);
    });

    it('존재하지 않는 reservationId면 row를 생성하지 않는다', async () => {
      const before = await prisma.discardedReservation.count();
      await repository.saveNoShowByReservationId(reservationId + 9_999_999);
      const after = await prisma.discardedReservation.count();
      expect(after).toBe(before);
    });
  });

  describe('discardReason (DR-INT-001)', () => {
    const runId = Date.now();
    const reservationIds: number[] = [];

    const email = (suffix: string) =>
      `discard-reason-int-${runId}-${suffix}@integration.test`;

    async function createBareReservation(title: string): Promise<number> {
      const reservation = await prisma.reservation.create({
        data: {
          date: AppKstDateTime.dateFormmatForDB(RESERVATION_DATE_YMD),
          startTime: AppKstDateTime.timeFormmatForDB('11:00'),
          endTime: AppKstDateTime.timeFormmatForDB('12:00'),
          title,
          reservationType: 'REGULAR',
          participationAvailable: true,
          creatorId: null,
          externalCreatorName: null,
        },
      });
      reservationIds.push(reservation.reservationId);
      return reservation.reservationId;
    }

    afterAll(async () => {
      if (!prisma || reservationIds.length === 0) return;

      await prisma.discardedReservation.deleteMany({
        where: { reservationId: { in: reservationIds } },
      });
      await prisma.reservation.deleteMany({
        where: { reservationId: { in: reservationIds } },
      });
    });

    it('인자 없이 호출하면 discardReason이 NO_SHOW이다', async () => {
      const id = await createBareReservation(`discard-reason-noshow-${runId}`);

      await repository.saveNoShowByReservationId(id);

      const row = await prisma.discardedReservation.findUnique({
        where: { reservationId: id },
      });
      expect(row!.discardReason).toBe('NO_SHOW');
    });

    it('SYSTEM_RECOVERY를 넘기면 discardReason이 SYSTEM_RECOVERY이다', async () => {
      const id = await createBareReservation(
        `discard-reason-recovery-${runId}`,
      );

      await repository.saveNoShowByReservationId(id, 'SYSTEM_RECOVERY');

      const row = await prisma.discardedReservation.findUnique({
        where: { reservationId: id },
      });
      expect(row!.discardReason).toBe('SYSTEM_RECOVERY');
    });

    it('재호출 시 discardReason이 SYSTEM_RECOVERY로 갱신된다', async () => {
      const id = await createBareReservation(`discard-reason-upsert-${runId}`);

      await repository.saveNoShowByReservationId(id);
      await repository.saveNoShowByReservationId(id, 'SYSTEM_RECOVERY');

      const row = await prisma.discardedReservation.findUnique({
        where: { reservationId: id },
      });
      expect(row!.discardReason).toBe('SYSTEM_RECOVERY');
    });
  });

  describe('reservationSnapshot include (DR-INT-002)', () => {
    const runId = Date.now();
    let testClubId: number;
    let creatorMemberId: number;
    let participatorMemberId: number;
    let creatorRoleAssignmentId: number;
    let participatorRoleAssignmentId: number;
    let instrumentId: number;
    let reservationId: number;

    const email = (suffix: string) =>
      `discard-snapshot-int-${runId}-${suffix}@integration.test`;

    beforeAll(async () => {
      const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
      testClubId = (maxClub._max.clubId ?? 0) + 41_000;

      await prisma.club.create({
        data: {
          clubId: testClubId,
          clubName: `폐기스냅샷동아리-${testClubId}`,
          profileImageUrl: null,
        },
      });

      const creator = await prisma.member.create({
        data: {
          email: email('creator'),
          password: 'pw',
          name: '폐기스냅샷생성자',
          nickname: '생성자패명',
          enrollmentNumber: `discard-snap-${runId}-c`,
          clubId: testClubId,
        },
      });
      creatorMemberId = creator.memberId;

      const participator = await prisma.member.create({
        data: {
          email: email('participator'),
          password: 'pw',
          name: '폐기스냅샷참여자',
          enrollmentNumber: `discard-snap-${runId}-p`,
          clubId: testClubId,
        },
      });
      participatorMemberId = participator.memberId;

      const creatorRole = await prisma.roleAssignment.create({
        data: {
          clubId: testClubId,
          memberId: creatorMemberId,
          role: 'LEADER',
        },
      });
      creatorRoleAssignmentId = creatorRole.roleAssignmentId;

      const participatorRole = await prisma.roleAssignment.create({
        data: {
          clubId: testClubId,
          memberId: participatorMemberId,
          role: 'SUBUK',
        },
      });
      participatorRoleAssignmentId = participatorRole.roleAssignmentId;

      const instrument = await prisma.instrument.create({
        data: {
          instrumentType: 'JANGGU',
          clubId: testClubId,
          name: '폐기스냅샷-장구',
          borrowAvailable: true,
        },
      });
      instrumentId = instrument.instrumentId;

      const reservation = await prisma.reservation.create({
        data: {
          date: AppKstDateTime.dateFormmatForDB(SNAPSHOT_DATE_YMD),
          startTime: AppKstDateTime.timeFormmatForDB('14:00'),
          endTime: AppKstDateTime.timeFormmatForDB('16:00'),
          title: `discard-snapshot-${runId}`,
          reservationType: 'REGULAR',
          participationAvailable: true,
          creatorId: creatorMemberId,
          participators: {
            connect: [{ memberId: participatorMemberId }],
          },
          borrowInstruments: {
            connect: [{ instrumentId }],
          },
        },
      });
      reservationId = reservation.reservationId;
    });

    afterAll(async () => {
      if (!prisma) return;

      await prisma.discardedReservation.deleteMany({
        where: { reservationId },
      });
      await prisma.reservation.delete({ where: { reservationId } });
      await prisma.roleAssignment.deleteMany({ where: { clubId: testClubId } });
      await prisma.instrument.deleteMany({ where: { instrumentId } });
      await prisma.member.deleteMany({
        where: {
          memberId: { in: [creatorMemberId, participatorMemberId] },
        },
      });
      await prisma.club.delete({ where: { clubId: testClubId } });
    });

    it('creator·participators·borrowInstruments 스냅샷을 포함한다', async () => {
      await repository.saveNoShowByReservationId(reservationId);

      const row = await prisma.discardedReservation.findUnique({
        where: { reservationId },
      });
      expect(row).not.toBeNull();

      const snapshot = row!.reservationSnapshot as DiscardedReservationSnapshot;

      expect(snapshot.creatorSnapshot).toEqual({
        memberId: creatorMemberId,
        name: '폐기스냅샷생성자',
        nickname: '생성자패명',
        email: email('creator'),
        enrollmentNumber: `discard-snap-${runId}-c`,
        club: {
          clubId: testClubId,
          clubName: `폐기스냅샷동아리-${testClubId}`,
        },
        roles: [
          {
            roleAssignmentId: creatorRoleAssignmentId,
            role: 'LEADER',
            clubId: testClubId,
          },
        ],
      } satisfies DiscardedReservationMemberSnapshot);

      expect(snapshot.participators).toHaveLength(1);
      expect(snapshot.participators[0]).toEqual({
        memberId: participatorMemberId,
        name: '폐기스냅샷참여자',
        nickname: null,
        email: email('participator'),
        enrollmentNumber: `discard-snap-${runId}-p`,
        club: {
          clubId: testClubId,
          clubName: `폐기스냅샷동아리-${testClubId}`,
        },
        roles: [
          {
            roleAssignmentId: participatorRoleAssignmentId,
            role: 'SUBUK',
            clubId: testClubId,
          },
        ],
      } satisfies DiscardedReservationMemberSnapshot);

      expect(snapshot.borrowInstruments).toHaveLength(1);
      expect(snapshot.borrowInstruments[0]).toEqual({
        instrumentId,
        name: '폐기스냅샷-장구',
        imageUrl: null,
        instrumentType: 'JANGGU',
        borrowAvailable: true,
        club: {
          clubId: testClubId,
          clubName: `폐기스냅샷동아리-${testClubId}`,
        },
      } satisfies DiscardedReservationInstrumentSnapshot);
    });
  });

  describe('findLatest pagination (DR-INT-003)', () => {
    const runId = Date.now();
    const seededReservationIds: number[] = [];
    const seededDiscardedReservationIds: number[] = [];
    let baselineTotal: number;

    const PAGINATION_CREATED_AT_BASE = new Date('2099-01-01T00:00:00.000Z');

    const email = (suffix: string) =>
      `discard-page-int-${runId}-${suffix}@integration.test`;

    beforeAll(async () => {
      baselineTotal = await prisma.discardedReservation.count();

      for (let i = 0; i < 5; i++) {
        const reservation = await prisma.reservation.create({
          data: {
            date: AppKstDateTime.dateFormmatForDB('2030-10-01'),
            startTime: AppKstDateTime.timeFormmatForDB('09:00'),
            endTime: AppKstDateTime.timeFormmatForDB('10:00'),
            title: `discard-page-${runId}-${i}`,
            reservationType: 'REGULAR',
            participationAvailable: true,
            creatorId: null,
            externalCreatorName: null,
          },
        });
        seededReservationIds.push(reservation.reservationId);

        await repository.saveNoShowByReservationId(reservation.reservationId);

        const discarded = await prisma.discardedReservation.findUnique({
          where: { reservationId: reservation.reservationId },
        });
        seededDiscardedReservationIds.push(discarded!.discardedReservationId);

        await prisma.discardedReservation.update({
          where: { discardedReservationId: discarded!.discardedReservationId },
          data: {
            createdAt: new Date(
              PAGINATION_CREATED_AT_BASE.getTime() + i * 60_000,
            ),
          },
        });
      }
    });

    afterAll(async () => {
      if (!prisma || seededReservationIds.length === 0) return;

      await prisma.discardedReservation.deleteMany({
        where: { reservationId: { in: seededReservationIds } },
      });
      await prisma.reservation.deleteMany({
        where: { reservationId: { in: seededReservationIds } },
      });
    });

    function filterSeededItems(
      items: { reservationId: number }[],
    ): number[] {
      return items
        .filter((item) => seededReservationIds.includes(item.reservationId))
        .map((item) => item.reservationId);
    }

    it('findLatest(0, 2)는 최신 2건과 baseline+5 total을 반환한다', async () => {
      const page = await repository.findLatest(0, 2);

      expect(page.items).toHaveLength(2);
      expect(page.total).toBe(baselineTotal + 5);

      const seededOnPage = filterSeededItems(page.items);
      expect(seededOnPage).toEqual([
        seededReservationIds[4],
        seededReservationIds[3],
      ]);
    });

    it('findLatest(1, 2)는 두 번째 페이지 시드 2건을 반환한다', async () => {
      const page = await repository.findLatest(1, 2);

      expect(page.items).toHaveLength(2);

      const seededOnPage = filterSeededItems(page.items);
      expect(seededOnPage).toEqual([
        seededReservationIds[2],
        seededReservationIds[1],
      ]);
    });

    it('시드 행은 createdAt 내림차순으로 정렬된다', async () => {
      const page = await repository.findLatest(0, 5);

      const seededOnPage = filterSeededItems(page.items);
      expect(seededOnPage).toEqual([
        seededReservationIds[4],
        seededReservationIds[3],
        seededReservationIds[2],
        seededReservationIds[1],
        seededReservationIds[0],
      ]);

      const seededRows = await prisma.discardedReservation.findMany({
        where: { reservationId: { in: seededReservationIds } },
        orderBy: { createdAt: 'desc' },
      });
      expect(seededRows.map((row) => row.reservationId)).toEqual(
        seededOnPage,
      );
    });
  });
});
