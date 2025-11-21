import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import type { IMemberRepository } from 'src/features/member/application/ports/out/member.repository.port';
import { MemberLookupService } from 'src/features/member/application/use-case/member-lookup.use-case';
import { MemberPrismaRepository } from 'src/features/member/infrastructure/out/prisma/member.prisma.repository';
import type { IInstrumentRepository } from 'src/features/instrument/repositories/instrument.repository.port';
import { InstrumentRepository } from 'src/features/instrument/repositories/instrument.repository';
import { PrismaReservationRepository } from 'src/features/reservation/infrastructure/out/prisma/reservation.repository.impl';
import { ReservationMemberLookupAdapter } from 'src/features/reservation/infrastructure/out/adapters/reservation-member-lookup.adapter';
import { ReservationInstrumentLookupAdapter } from 'src/features/reservation/infrastructure/out/adapters/reservation-instrument-lookup.adapter';
import { ReservationAdminLookupAdapter } from 'src/features/reservation/infrastructure/out/adapters/reservation-admin-lookup.adapter';
import { AdminLevelLookupService } from 'src/features/admin/application/use-case/admin-level-lookup.use-case';
import { PrismaAdminRepository } from 'src/features/admin/infrastructure/out/prisma/admin.prisma.repository';
import type { ReservationEventPublisherPort } from 'src/features/reservation/application/ports/out/reservation-event-publisher.port';
import { CreateReservationResourceLoaderService } from 'src/features/reservation/application/user/services/create-reservation-resource-loader.service';
import { AdminBatchCreateReservationHandler } from './admin-batch-create-reservation.handler';
import { AdminBatchCreateReservationCommand } from '../admin-batch-create-reservation.command';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const BATCH_START_YMD = '2030-06-15';
const BATCH_END_YMD = '2030-06-21';
const CONFLICT_DATE_YMD = '2030-06-15';

describeIntegration('AdminBatchCreateReservationHandler (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaReservationRepository;
  let handler: AdminBatchCreateReservationHandler;
  let eventPublisher: jest.Mocked<
    Pick<
      ReservationEventPublisherPort,
      | 'sendAdminBatchInviteNotification'
      | 'sendAdminBatchOverlapCancelledNotification'
    >
  >;

  const runId = Date.now();
  let testClubId: number;
  let superAdminMemberId: number;
  let creatorMemberId: number;
  let subAdminMemberId: number;
  let conflictParticipatorMemberId: number;

  const createdReservationIds: number[] = [];

  const email = (suffix: string) =>
    `admin-batch-int-${runId}-${suffix}@integration.test`;

  function trackReservationId(id: number | undefined) {
    if (id !== undefined) createdReservationIds.push(id);
    return id;
  }

  function buildConflictCreator(): ReservationCreator {
    return ReservationCreator.create({
      memberId: conflictParticipatorMemberId,
      name: '배치충돌참여자',
      nickname: null,
      email: email('conflict-p'),
      enrollmentNumber: `admin-batch-int-${runId}-cp`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `admin-batch-int-club-${testClubId}`,
      roles: [],
    });
  }

  function buildConflictParticipator(): ReservationParticipator {
    return ReservationParticipator.create({
      memberId: conflictParticipatorMemberId,
      name: '배치충돌참여자',
      nickname: null,
      email: email('conflict-p'),
      enrollmentNumber: `admin-batch-int-${runId}-cp`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `admin-batch-int-club-${testClubId}`,
      roles: [],
    });
  }

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new PrismaReservationRepository(
      prisma as unknown as PrismaService,
    );

    const memberRepository = new MemberPrismaRepository(
      prisma as unknown as PrismaService,
    );
    const memberLookupService = new MemberLookupService(
      memberRepository as unknown as IMemberRepository,
    );
    const memberLookup = new ReservationMemberLookupAdapter(memberLookupService);
    const instrumentRepository = new InstrumentRepository(
      prisma as unknown as PrismaService,
    );
    const instrumentLookup = new ReservationInstrumentLookupAdapter(
      instrumentRepository as unknown as IInstrumentRepository,
    );
    const resourceLoader = new CreateReservationResourceLoaderService(
      memberLookup,
      instrumentLookup,
    );
    const adminLevelLookup = new AdminLevelLookupService(
      new PrismaAdminRepository(prisma as unknown as PrismaService),
    );
    const adminLookup = new ReservationAdminLookupAdapter(adminLevelLookup);

    eventPublisher = {
      sendAdminBatchInviteNotification: jest.fn(),
      sendAdminBatchOverlapCancelledNotification: jest.fn(),
    };

    handler = new AdminBatchCreateReservationHandler(
      repository,
      eventPublisher as unknown as ReservationEventPublisherPort,
      adminLookup,
      resourceLoader,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 53_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `admin-batch-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const superAdmin = await prisma.member.create({
      data: {
        email: email('super'),
        password: 'pw',
        name: '배치슈퍼관리자',
        enrollmentNumber: `admin-batch-int-${runId}-sa`,
        clubId: testClubId,
        adminLevel: 'SUPER',
      },
    });
    superAdminMemberId = superAdmin.memberId;

    const creator = await prisma.member.create({
      data: {
        email: email('creator'),
        password: 'pw',
        name: '배치생성자',
        enrollmentNumber: `admin-batch-int-${runId}-c`,
        clubId: testClubId,
      },
    });
    creatorMemberId = creator.memberId;

    const subAdmin = await prisma.member.create({
      data: {
        email: email('sub'),
        password: 'pw',
        name: '배치부관리자',
        enrollmentNumber: `admin-batch-int-${runId}-sub`,
        clubId: testClubId,
        adminLevel: 'SUB',
      },
    });
    subAdminMemberId = subAdmin.memberId;

    const conflictMember = await prisma.member.create({
      data: {
        email: email('conflict-p'),
        password: 'pw',
        name: '배치충돌참여자',
        enrollmentNumber: `admin-batch-int-${runId}-cp`,
        clubId: testClubId,
      },
    });
    conflictParticipatorMemberId = conflictMember.memberId;
  });

  afterAll(async () => {
    if (!prisma) return;

    if (createdReservationIds.length > 0) {
      await prisma.reservation.deleteMany({
        where: { reservationId: { in: createdReservationIds } },
      });
    }

    await prisma.reservation.deleteMany({
      where: {
        title: {
          in: [
            '통합-배치-REGULAR',
            '통합-배치-EXTERNAL',
            '통합-배치-충돌기존',
            '통합-배치-무권한',
            '통합-배치-롤백충돌',
            '통합-배치-롤백실패',
          ],
        },
      },
    });

    await prisma.member.deleteMany({
      where: {
        memberId: {
          in: [
            superAdminMemberId,
            creatorMemberId,
            subAdminMemberId,
            conflictParticipatorMemberId,
          ],
        },
      },
    });
    await prisma.club.delete({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('REGULAR 일괄 예약은 기간 내 해당 요일에만 행을 생성한다', async () => {
    const result = await handler.execute(
      new AdminBatchCreateReservationCommand(superAdminMemberId, {
        dayTimes: [{ day: '토', startTime: '10:00', endTime: '12:00' }],
        duration: { startDate: BATCH_START_YMD, endDate: BATCH_END_YMD },
        batchReservationOption: {
          title: '통합-배치-REGULAR',
          reservationType: 'REGULAR',
          creatorId: creatorMemberId,
        },
      }),
    );

    expect(result).toEqual({
      message: 'Routine reservations registered successfully',
    });

    const rows = await prisma.reservation.findMany({
      where: { title: '통합-배치-REGULAR' },
      select: { reservationId: true, date: true, reservationType: true },
      orderBy: { date: 'asc' },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].reservationType).toBe('REGULAR');
    expect(rows[0].date).toEqual(AppKstDateTime.dateFormmatForDB(BATCH_START_YMD));
    trackReservationId(rows[0].reservationId);

    expect(eventPublisher.sendAdminBatchInviteNotification).toHaveBeenCalledWith({
      reservationId: rows[0].reservationId,
      title: '통합-배치-REGULAR',
      participatorIds: [creatorMemberId],
    });
  });

  it('EXTERNAL 일괄 예약은 externalCreatorName으로 저장한다', async () => {
    await handler.execute(
      new AdminBatchCreateReservationCommand(superAdminMemberId, {
        dayTimes: [{ day: '토', startTime: '14:00', endTime: '15:00' }],
        duration: { startDate: BATCH_START_YMD, endDate: BATCH_END_YMD },
        batchReservationOption: {
          title: '통합-배치-EXTERNAL',
          reservationType: 'EXTERNAL',
          creatorName: '외부 일괄 기관',
        },
      }),
    );

    const row = await prisma.reservation.findFirst({
      where: { title: '통합-배치-EXTERNAL' },
      select: {
        reservationId: true,
        reservationType: true,
        externalCreatorName: true,
        creatorId: true,
      },
    });

    expect(row?.reservationType).toBe('EXTERNAL');
    expect(row?.externalCreatorName).toBe('외부 일괄 기관');
    expect(row?.creatorId).toBeNull();
    trackReservationId(row?.reservationId);
  });

  it('SUPER가 아니면 UnauthorizedException이고 새 예약이 생기지 않는다', async () => {
    const beforeCount = await prisma.reservation.count({
      where: { title: '통합-배치-무권한' },
    });

    await expect(
      handler.execute(
        new AdminBatchCreateReservationCommand(subAdminMemberId, {
          dayTimes: [{ day: '토', startTime: '16:00', endTime: '17:00' }],
          duration: { startDate: BATCH_START_YMD, endDate: BATCH_END_YMD },
          batchReservationOption: {
            title: '통합-배치-무권한',
            reservationType: 'COMMON',
            creatorId: creatorMemberId,
          },
        }),
      ),
    ).rejects.toThrow(UnauthorizedException);

    const afterCount = await prisma.reservation.count({
      where: { title: '통합-배치-무권한' },
    });
    expect(afterCount).toBe(beforeCount);
    expect(eventPublisher.sendAdminBatchInviteNotification).not.toHaveBeenCalled();
    expect(
      eventPublisher.sendAdminBatchOverlapCancelledNotification,
    ).not.toHaveBeenCalled();
  });

  it('시간 충돌 시 기존 예약을 삭제하고 참여자에게 취소 알림을 보낸다', async () => {
    const conflictDate = AppKstDateTime.dateFormmatForDB(CONFLICT_DATE_YMD);
    const existing = await repository.save(
      ReservationEntity.create({
        date: conflictDate,
        startTime: '10:00',
        endTime: '12:00',
        title: '통합-배치-충돌기존',
        reservationType: 'REGULAR',
        participationAvailable: true,
        creator: buildConflictCreator(),
        participators: [buildConflictParticipator()],
        borrowInstruments: [],
      }),
    );
    trackReservationId(existing.reservationId);

    await handler.execute(
      new AdminBatchCreateReservationCommand(superAdminMemberId, {
        dayTimes: [{ day: '토', startTime: '11:00', endTime: '13:00' }],
        duration: { startDate: BATCH_START_YMD, endDate: BATCH_END_YMD },
        batchReservationOption: {
          title: '통합-배치-REGULAR',
          reservationType: 'REGULAR',
          creatorId: creatorMemberId,
        },
      }),
    );

    const deleted = await prisma.reservation.findUnique({
      where: { reservationId: existing.reservationId! },
    });
    expect(deleted).toBeNull();

    expect(
      eventPublisher.sendAdminBatchOverlapCancelledNotification,
    ).toHaveBeenCalledWith({
      reservationId: existing.reservationId!,
      title: '통합-배치-충돌기존',
      participatorIds: [conflictParticipatorMemberId],
    });
  });

  it('충돌 삭제 후 일괄 생성이 실패하면 롤백되고 overlap·invite 알림을 보내지 않는다', async () => {
    const conflictDate = AppKstDateTime.dateFormmatForDB(CONFLICT_DATE_YMD);
    const existing = await repository.save(
      ReservationEntity.create({
        date: conflictDate,
        startTime: '10:00',
        endTime: '12:00',
        title: '통합-배치-롤백충돌',
        reservationType: 'REGULAR',
        participationAvailable: true,
        creator: buildConflictCreator(),
        participators: [buildConflictParticipator()],
        borrowInstruments: [],
      }),
    );
    trackReservationId(existing.reservationId);

    await expect(
      handler.execute(
        new AdminBatchCreateReservationCommand(superAdminMemberId, {
          dayTimes: [{ day: '토', startTime: '11:00', endTime: '13:00' }],
          duration: { startDate: BATCH_START_YMD, endDate: BATCH_END_YMD },
          batchReservationOption: {
            title: '통합-배치-롤백실패',
            reservationType: 'REGULAR',
            creatorId: 9_999_999_999,
          },
        }),
      ),
    ).rejects.toThrow(InternalServerErrorException);

    const stillExists = await prisma.reservation.findUnique({
      where: { reservationId: existing.reservationId! },
    });
    expect(stillExists).not.toBeNull();

    const failedCount = await prisma.reservation.count({
      where: { title: '통합-배치-롤백실패' },
    });
    expect(failedCount).toBe(0);

    expect(
      eventPublisher.sendAdminBatchOverlapCancelledNotification,
    ).not.toHaveBeenCalled();
    expect(eventPublisher.sendAdminBatchInviteNotification).not.toHaveBeenCalled();
  });
});
