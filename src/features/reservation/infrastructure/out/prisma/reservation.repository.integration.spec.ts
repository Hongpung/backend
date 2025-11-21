import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';
import { ReservationBorrowInstrument } from 'src/features/reservation/domain/entities/reservation-borrow-instrument.entity';
import { PrismaReservationRepository } from './reservation.repository.impl';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const RESERVATION_DATE_YMD = '2030-06-15';
const RESERVATION_DATE = AppKstDateTime.dateFormmatForDB(RESERVATION_DATE_YMD);
const CONFLICT_DATE_YMD = '2030-06-16';
const CONFLICT_DATE = AppKstDateTime.dateFormmatForDB(CONFLICT_DATE_YMD);

describeIntegration('PrismaReservationRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaReservationRepository;

  const runId = Date.now();
  let testClubId: number;
  let creatorMemberId: number;
  let participatorMemberId: number;
  let instrumentId: number;

  const createdReservationIds: number[] = [];

  const email = (suffix: string) =>
    `reservation-repo-int-${runId}-${suffix}@integration.test`;

  function trackReservationId(id: number | undefined) {
    if (id !== undefined) createdReservationIds.push(id);
    return id;
  }

  function buildCreator(): ReservationCreator {
    return ReservationCreator.create({
      memberId: creatorMemberId,
      name: '통합생성자',
      nickname: '생성자패명',
      email: email('creator'),
      enrollmentNumber: `res-int-${runId}-c`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `통합동아리-${testClubId}`,
      roles: ['패짱'],
    });
  }

  function buildParticipator(memberId: number): ReservationParticipator {
    return ReservationParticipator.create({
      memberId,
      name: memberId === creatorMemberId ? '통합생성자' : '통합참여자',
      nickname: null,
      email:
        memberId === creatorMemberId ? email('creator') : email('participator'),
      enrollmentNumber:
        memberId === creatorMemberId
          ? `res-int-${runId}-c`
          : `res-int-${runId}-p`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `통합동아리-${testClubId}`,
      roles: memberId === creatorMemberId ? ['패짱'] : [],
    });
  }

  function buildInternalEntity(
    overrides: Partial<{
      date: Date;
      startTime: string;
      endTime: string;
      title: string;
      reservationType: 'REGULAR' | 'COMMON';
      reservationId: number;
      participators: ReservationParticipator[];
      borrowInstruments: ReservationBorrowInstrument[];
    }> = {},
  ): ReservationEntity {
    const creator = buildCreator();
    return ReservationEntity.create({
      date: overrides.date ?? RESERVATION_DATE,
      startTime: overrides.startTime ?? '10:00',
      endTime: overrides.endTime ?? '12:00',
      title: overrides.title ?? '통합-내부예약',
      reservationType: overrides.reservationType ?? 'REGULAR',
      participationAvailable: true,
      creator,
      participators: overrides.participators ?? [
        buildParticipator(creatorMemberId),
        buildParticipator(participatorMemberId),
      ],
      borrowInstruments: overrides.borrowInstruments ?? [],
      reservationId: overrides.reservationId,
    });
  }

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new PrismaReservationRepository(
      prisma as unknown as PrismaService,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 40_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `통합동아리-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const creator = await prisma.member.create({
      data: {
        email: email('creator'),
        password: 'pw',
        name: '통합생성자',
        enrollmentNumber: `res-int-${runId}-c`,
        clubId: testClubId,
      },
    });
    creatorMemberId = creator.memberId;

    const participator = await prisma.member.create({
      data: {
        email: email('participator'),
        password: 'pw',
        name: '통합참여자',
        enrollmentNumber: `res-int-${runId}-p`,
        clubId: testClubId,
      },
    });
    participatorMemberId = participator.memberId;

    await prisma.roleAssignment.create({
      data: {
        clubId: testClubId,
        memberId: creatorMemberId,
        role: 'LEADER',
      },
    });

    const instrument = await prisma.instrument.create({
      data: {
        instrumentType: 'JANGGU',
        clubId: testClubId,
        name: '통합-장구',
        borrowAvailable: true,
      },
    });
    instrumentId = instrument.instrumentId;
  });

  afterAll(async () => {
    if (!prisma) return;

    if (createdReservationIds.length > 0) {
      await prisma.reservation.deleteMany({
        where: { reservationId: { in: createdReservationIds } },
      });
    }

    await prisma.roleAssignment.deleteMany({ where: { clubId: testClubId } });
    await prisma.member.deleteMany({
      where: {
        memberId: { in: [creatorMemberId, participatorMemberId] },
      },
    });
    await prisma.instrument.deleteMany({ where: { instrumentId } });
    await prisma.club.delete({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('save', () => {
    it('INTERNAL(REGULAR) 예약을 저장하고 creator·participators를 매핑한다', async () => {
      const borrow = ReservationBorrowInstrument.create({
        instrumentId,
        name: '통합-장구',
        instrumentType: 'JANGGU',
        imageUrl: null,
        borrowAvailable: true,
        clubName: `통합동아리-${testClubId}`,
      });

      const saved = await repository.save(
        buildInternalEntity({ borrowInstruments: [borrow] }),
      );
      trackReservationId(saved.reservationId);

      expect(saved.reservationId).toBeDefined();
      expect(saved.reservationType).toBe('REGULAR');
      expect(saved.creator).toBeInstanceOf(ReservationCreator);
      expect((saved.creator as ReservationCreator).memberId).toBe(
        creatorMemberId,
      );
      expect(saved.participators.map((p) => p.memberId).sort()).toEqual(
        [creatorMemberId, participatorMemberId].sort(),
      );
      expect(saved.borrowInstruments).toHaveLength(1);
      expect(saved.borrowInstruments[0].instrumentId).toBe(instrumentId);

      const row = await prisma.reservation.findUnique({
        where: { reservationId: saved.reservationId! },
        select: {
          creatorId: true,
          externalCreatorName: true,
          reservationType: true,
        },
      });
      expect(row?.creatorId).toBe(creatorMemberId);
      expect(row?.externalCreatorName).toBeNull();
      expect(row?.reservationType).toBe('REGULAR');
    });

    it('EXTERNAL 예약을 저장하면 externalCreatorName만 설정한다', async () => {
      const saved = await repository.save(
        ReservationEntity.create({
          date: RESERVATION_DATE,
          startTime: '14:00',
          endTime: '15:00',
          title: '통합-외부예약',
          reservationType: 'EXTERNAL',
          participationAvailable: false,
          creator: '  외부 단체  ',
          participators: [buildParticipator(creatorMemberId)],
          borrowInstruments: [],
        }),
      );
      trackReservationId(saved.reservationId);

      expect(saved.reservationType).toBe('EXTERNAL');
      expect(saved.creator).toBe('외부 단체');

      const row = await prisma.reservation.findUnique({
        where: { reservationId: saved.reservationId! },
        select: { creatorId: true, externalCreatorName: true },
      });
      expect(row?.creatorId).toBeNull();
      expect(row?.externalCreatorName).toBe('외부 단체');
    });
  });

  describe('transaction', () => {
    it('트랜잭션 커밋 시 예약이 DB에 남는다', async () => {
      const reservationId = await repository.transaction(async (tx) => {
        const saved = await repository.save(
          buildInternalEntity({
            startTime: '16:00',
            endTime: '17:00',
            title: '통합-트랜잭션커밋',
          }),
          tx,
        );
        return saved.reservationId!;
      });
      trackReservationId(reservationId);

      const count = await prisma.reservation.count({
        where: { reservationId },
      });
      expect(count).toBe(1);
    });

    it('트랜잭션 롤백 시 예약이 DB에 남지 않는다', async () => {
      const beforeCount = await prisma.reservation.count({
        where: { title: '통합-트랜잭션롤백' },
      });

      await expect(
        repository.transaction(async (tx) => {
          await repository.save(
            buildInternalEntity({
              startTime: '18:00',
              endTime: '19:00',
              title: '통합-트랜잭션롤백',
            }),
            tx,
          );
          throw new Error('의도적 롤백');
        }),
      ).rejects.toThrow('의도적 롤백');

      const afterCount = await prisma.reservation.count({
        where: { title: '통합-트랜잭션롤백' },
      });
      expect(afterCount).toBe(beforeCount);
    });
  });

  describe('findConflictReservations / someConflictReservation', () => {
    it('겹치는 시간대 예약 ID를 반환하고 notIncludeId로 자기 자신을 제외한다', async () => {
      const first = await repository.save(
        buildInternalEntity({
          date: CONFLICT_DATE,
          startTime: '10:00',
          endTime: '12:00',
          title: '통합-충돌A',
        }),
      );
      trackReservationId(first.reservationId);

      const second = await repository.save(
        buildInternalEntity({
          date: CONFLICT_DATE,
          startTime: '11:00',
          endTime: '13:00',
          title: '통합-충돌B',
        }),
      );
      trackReservationId(second.reservationId);

      const conflicts = await repository.findConflictReservations({
        date: CONFLICT_DATE_YMD,
        startTime: '11:30',
        endTime: '12:30',
      });
      const conflictIds = conflicts.map((c) => c.reservationId).sort();
      expect(conflictIds).toEqual(
        [first.reservationId!, second.reservationId!].sort((a, b) => a - b),
      );

      const excludingSecond = await repository.findConflictReservations({
        date: CONFLICT_DATE_YMD,
        startTime: '11:30',
        endTime: '12:30',
        notIncludeId: second.reservationId,
      });
      expect(excludingSecond.map((c) => c.reservationId)).toEqual([
        first.reservationId,
      ]);

      expect(
        await repository.someConflictReservation({
          date: CONFLICT_DATE_YMD,
          startTime: '09:00',
          endTime: '09:30',
        }),
      ).toBe(false);

      expect(
        await repository.someConflictReservation({
          date: CONFLICT_DATE_YMD,
          startTime: '11:30',
          endTime: '12:30',
          notIncludeId: first.reservationId,
        }),
      ).toBe(true);
    });
  });

  describe('findReservationById', () => {
    it('저장한 예약을 ID로 조회한다', async () => {
      const saved = await repository.save(
        buildInternalEntity({
          startTime: '09:00',
          endTime: '10:00',
          title: '통합-ID조회',
        }),
      );
      trackReservationId(saved.reservationId);

      const found = await repository.findReservationById(saved.reservationId!);

      expect(found).not.toBeNull();
      expect(found!.reservationId).toBe(saved.reservationId);
      expect(found!.title).toBe('통합-ID조회');
      expect((found!.creator as ReservationCreator).memberId).toBe(
        creatorMemberId,
      );
    });

    it('없는 ID면 null을 반환한다', async () => {
      const found = await repository.findReservationById(9_999_999_999);
      expect(found).toBeNull();
    });
  });

  describe('findReservationDetail', () => {
    it('상세 조회 시 creator·participators·borrowInstruments를 포함한다', async () => {
      const borrow = ReservationBorrowInstrument.create({
        instrumentId,
        name: '통합-장구',
        instrumentType: 'JANGGU',
        imageUrl: null,
        borrowAvailable: true,
        clubName: `통합동아리-${testClubId}`,
      });

      const saved = await repository.save(
        buildInternalEntity({
          startTime: '09:30',
          endTime: '10:30',
          title: '통합-상세조회',
          borrowInstruments: [borrow],
        }),
      );
      trackReservationId(saved.reservationId);

      const detail = await repository.findReservationDetail(saved.reservationId!);

      expect(detail).not.toBeNull();
      expect(detail!.title).toBe('통합-상세조회');
      expect(detail!.participators).toHaveLength(2);
      expect(detail!.borrowInstruments).toHaveLength(1);
    });
  });

  describe('findReservationsByDate', () => {
    it('해당 날짜의 예약만 반환한다', async () => {
      const onDate = await repository.save(
        buildInternalEntity({
          date: RESERVATION_DATE,
          startTime: '11:00',
          endTime: '12:00',
          title: '통합-날짜조회-당일',
        }),
      );
      trackReservationId(onDate.reservationId);

      const otherDate = await repository.save(
        buildInternalEntity({
          date: CONFLICT_DATE,
          startTime: '11:00',
          endTime: '12:00',
          title: '통합-날짜조회-다른날',
        }),
      );
      trackReservationId(otherDate.reservationId);

      const rows = await repository.findReservationsByDate(RESERVATION_DATE);
      const titles = rows.map((r) => r.title);

      expect(titles).toContain('통합-날짜조회-당일');
      expect(titles).not.toContain('통합-날짜조회-다른날');
    });
  });

  describe('findReservationsByMonth', () => {
    it('startDate 이상·endDate 미만 범위의 예약을 반환한다', async () => {
      const inMonth = await repository.save(
        buildInternalEntity({
          date: RESERVATION_DATE,
          startTime: '13:00',
          endTime: '14:00',
          title: '통합-월조회-포함',
        }),
      );
      trackReservationId(inMonth.reservationId);

      const outOfMonth = await repository.save(
        buildInternalEntity({
          date: AppKstDateTime.dateFormmatForDB('2030-07-01'),
          startTime: '13:00',
          endTime: '14:00',
          title: '통합-월조회-제외',
        }),
      );
      trackReservationId(outOfMonth.reservationId);

      const rows = await repository.findReservationsByMonth(
        AppKstDateTime.dateFormmatForDB('2030-06-01'),
        AppKstDateTime.dateFormmatForDB('2030-07-01'),
      );
      const titles = rows.map((r) => r.title);

      expect(titles).toContain('통합-월조회-포함');
      expect(titles).not.toContain('통합-월조회-제외');
    });
  });

  describe('findReservationsByTerm', () => {
    it('startDate~endDate(포함) 기간의 예약을 반환한다', async () => {
      const inTerm = await repository.save(
        buildInternalEntity({
          date: RESERVATION_DATE,
          startTime: '15:00',
          endTime: '16:00',
          title: '통합-기간조회-포함',
        }),
      );
      trackReservationId(inTerm.reservationId);

      const afterTerm = await repository.save(
        buildInternalEntity({
          date: AppKstDateTime.dateFormmatForDB('2030-06-20'),
          startTime: '15:00',
          endTime: '16:00',
          title: '통합-기간조회-제외',
        }),
      );
      trackReservationId(afterTerm.reservationId);

      const rows = await repository.findReservationsByTerm(
        AppKstDateTime.dateFormmatForDB('2030-06-15'),
        AppKstDateTime.dateFormmatForDB('2030-06-16'),
      );
      const titles = rows.map((r) => r.title);

      expect(titles).toContain('통합-기간조회-포함');
      expect(titles).not.toContain('통합-기간조회-제외');
    });
  });

  describe('findOccupiedTimesByDate', () => {
    it('해당 날짜 예약의 점유 시간 요약을 반환한다', async () => {
      const saved = await repository.save(
        buildInternalEntity({
          startTime: '17:00',
          endTime: '18:00',
          title: '통합-점유시간',
        }),
      );
      trackReservationId(saved.reservationId);

      const occupied = await repository.findOccupiedTimesByDate(RESERVATION_DATE);
      const row = occupied.find((o) => o.reservationId === saved.reservationId);

      expect(row).toBeDefined();
      expect(row!.title).toBe('통합-점유시간');
      expect(row!.reservationType).toBe('REGULAR');
      expect(row!.startTime).toBeDefined();
      expect(row!.endTime).toBeDefined();
      expect(row!.creator?.name ?? row!.externalCreatorName).toBeTruthy();
    });
  });

  describe('findTodayReservationsByMemberId', () => {
    it('참여자·당일 날짜에 해당하는 예약만 반환한다', async () => {
      const today = await repository.save(
        buildInternalEntity({
          date: RESERVATION_DATE,
          startTime: '19:00',
          endTime: '20:00',
          title: '통합-오늘예약',
        }),
      );
      trackReservationId(today.reservationId);

      const tomorrow = await repository.save(
        buildInternalEntity({
          date: CONFLICT_DATE,
          startTime: '19:00',
          endTime: '20:00',
          title: '통합-내일예약',
          participators: [buildParticipator(participatorMemberId)],
        }),
      );
      trackReservationId(tomorrow.reservationId);

      const rows = await repository.findTodayReservationsByMemberId(
        participatorMemberId,
        RESERVATION_DATE,
      );
      const titles = rows.map((r) => r.title);

      expect(titles).toContain('통합-오늘예약');
      expect(titles).not.toContain('통합-내일예약');
    });
  });

  describe('findNextReservationsByMemberId', () => {
    it('시작일 이후 참여 예약을 skip·take로 조회한다', async () => {
      const earlier = await repository.save(
        buildInternalEntity({
          date: RESERVATION_DATE,
          startTime: '06:00',
          endTime: '07:00',
          title: '통합-다음예약-A',
          participators: [buildParticipator(participatorMemberId)],
        }),
      );
      trackReservationId(earlier.reservationId);

      const later = await repository.save(
        buildInternalEntity({
          date: CONFLICT_DATE,
          startTime: '08:00',
          endTime: '09:00',
          title: '통합-다음예약-B',
          participators: [buildParticipator(participatorMemberId)],
        }),
      );
      trackReservationId(later.reservationId);

      const rows = await repository.findNextReservationsByMemberId(
        participatorMemberId,
        RESERVATION_DATE,
        0,
        50,
      );
      const titles = rows
        .map((r) => r.title)
        .filter((title) =>
          ['통합-다음예약-A', '통합-다음예약-B'].includes(title),
        );

      expect(titles).toContain('통합-다음예약-A');
      expect(titles).toContain('통합-다음예약-B');
    });
  });

  describe('findReservationsForSchedulerByDate (P2)', () => {
    it('해당 날짜 예약을 startTime 오름차순으로 반환한다', async () => {
      const late = await repository.save(
        buildInternalEntity({
          startTime: '21:00',
          endTime: '22:00',
          title: '통합-스케줄러-늦음',
        }),
      );
      trackReservationId(late.reservationId);

      const early = await repository.save(
        buildInternalEntity({
          startTime: '07:00',
          endTime: '08:00',
          title: '통합-스케줄러-이른',
        }),
      );
      trackReservationId(early.reservationId);

      const rows = await repository.findReservationsForSchedulerByDate(
        RESERVATION_DATE,
      );
      const schedulerTitles = rows
        .filter((r) =>
          ['통합-스케줄러-늦음', '통합-스케줄러-이른'].includes(r.title),
        )
        .map((r) => r.title);

      expect(schedulerTitles).toEqual(['통합-스케줄러-이른', '통합-스케줄러-늦음']);
    });
  });

  describe('findReservationsByIds (P2)', () => {
    it('ID 목록에 해당하는 예약을 반환한다', async () => {
      const a = await repository.save(
        buildInternalEntity({
          startTime: '12:00',
          endTime: '13:00',
          title: '통합-IDs-A',
        }),
      );
      trackReservationId(a.reservationId);

      const b = await repository.save(
        buildInternalEntity({
          startTime: '13:30',
          endTime: '14:30',
          title: '통합-IDs-B',
        }),
      );
      trackReservationId(b.reservationId);

      const rows = await repository.findReservationsByIds([
        a.reservationId!,
        b.reservationId!,
      ]);
      const titles = rows.map((r) => r.title).sort();

      expect(titles).toEqual(['통합-IDs-A', '통합-IDs-B']);
    });

    it('빈 ID 목록이면 빈 배열을 반환한다', async () => {
      const rows = await repository.findReservationsByIds([]);
      expect(rows).toEqual([]);
    });
  });

  describe('delete / deleteMany', () => {
    it('delete로 단건 예약을 삭제한다', async () => {
      const saved = await repository.save(
        buildInternalEntity({
          startTime: '20:00',
          endTime: '21:00',
          title: '통합-단건삭제',
        }),
      );
      const id = saved.reservationId!;

      await repository.delete(id);

      const row = await prisma.reservation.findUnique({
        where: { reservationId: id },
      });
      expect(row).toBeNull();
    });

    it('deleteReservationsByIds·deleteManyReservations로 여러 건을 삭제한다', async () => {
      const a = await repository.save(
        buildInternalEntity({
          startTime: '22:00',
          endTime: '23:00',
          title: '통합-다건삭제A',
        }),
      );
      const b = await repository.save(
        buildInternalEntity({
          startTime: '23:00',
          endTime: '23:30',
          title: '통합-다건삭제B',
        }),
      );
      const ids = [a.reservationId!, b.reservationId!];

      const deleteManyResult = await repository.deleteReservationsByIds(ids);
      expect(deleteManyResult.count).toBe(2);

      const remaining = await prisma.reservation.count({
        where: { reservationId: { in: ids } },
      });
      expect(remaining).toBe(0);

      const orphan = await repository.save(
        buildInternalEntity({
          startTime: '08:00',
          endTime: '09:00',
          title: '통합-다건삭제C',
        }),
      );
      const orphanId = orphan.reservationId!;

      const bulk = await repository.deleteManyReservations({
        reservationId: { in: [orphanId] },
      });
      expect(bulk.count).toBe(1);

      const orphanRow = await prisma.reservation.findUnique({
        where: { reservationId: orphanId },
      });
      expect(orphanRow).toBeNull();
    });
  });
});
