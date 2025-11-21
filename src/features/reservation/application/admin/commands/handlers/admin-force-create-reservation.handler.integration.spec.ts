import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
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
import { AdminForceCreateReservationHandler } from './admin-force-create-reservation.handler';
import { AdminForceCreateReservationCommand } from '../admin-force-create-reservation.command';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const RESERVATION_DATE_YMD = '2030-06-15';
const CONFLICT_DATE_YMD = '2030-06-16';
const ROLLBACK_CONFLICT_DATE_YMD = '2030-06-17';

describeIntegration('AdminForceCreateReservationHandler (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaReservationRepository;
  let handler: AdminForceCreateReservationHandler;
  let eventPublisher: jest.Mocked<
    Pick<ReservationEventPublisherPort, 'sendAdminForceCancelledNotification'>
  >;

  const runId = Date.now();
  let testClubId: number;
  let superAdminMemberId: number;
  let nonAdminMemberId: number;
  let conflictParticipatorMemberId: number;

  const createdReservationIds: number[] = [];

  const email = (suffix: string) =>
    `admin-create-int-${runId}-${suffix}@integration.test`;

  function trackReservationId(id: number | undefined) {
    if (id !== undefined) createdReservationIds.push(id);
    return id;
  }

  function buildConflictCreator(): ReservationCreator {
    return ReservationCreator.create({
      memberId: conflictParticipatorMemberId,
      name: '충돌참여자',
      nickname: null,
      email: email('conflict-p'),
      enrollmentNumber: `admin-create-int-${runId}-cp`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `admin-create-int-club-${testClubId}`,
      roles: [],
    });
  }

  function buildConflictParticipator(): ReservationParticipator {
    return ReservationParticipator.create({
      memberId: conflictParticipatorMemberId,
      name: '충돌참여자',
      nickname: null,
      email: email('conflict-p'),
      enrollmentNumber: `admin-create-int-${runId}-cp`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `admin-create-int-club-${testClubId}`,
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
      sendAdminForceCancelledNotification: jest.fn(),
    };

    handler = new AdminForceCreateReservationHandler(
      repository,
      eventPublisher as unknown as ReservationEventPublisherPort,
      adminLookup,
      resourceLoader,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 48_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `admin-create-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const superAdmin = await prisma.member.create({
      data: {
        email: email('super'),
        password: 'pw',
        name: '슈퍼관리자',
        enrollmentNumber: `admin-create-int-${runId}-sa`,
        clubId: testClubId,
        adminLevel: 'SUPER',
      },
    });
    superAdminMemberId = superAdmin.memberId;

    const nonAdmin = await prisma.member.create({
      data: {
        email: email('user'),
        password: 'pw',
        name: '일반회원',
        enrollmentNumber: `admin-create-int-${runId}-u`,
        clubId: testClubId,
      },
    });
    nonAdminMemberId = nonAdmin.memberId;

    const conflictMember = await prisma.member.create({
      data: {
        email: email('conflict-p'),
        password: 'pw',
        name: '충돌참여자',
        enrollmentNumber: `admin-create-int-${runId}-cp`,
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

    await prisma.member.deleteMany({
      where: {
        memberId: {
          in: [superAdminMemberId, nonAdminMemberId, conflictParticipatorMemberId],
        },
      },
    });
    await prisma.club.delete({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('SUPER 관리자는 예약을 생성한다', async () => {
    const result = await handler.execute(
      new AdminForceCreateReservationCommand(
        {
          date: RESERVATION_DATE_YMD,
          startTime: '10:00',
          endTime: '12:00',
          title: '통합-관리자-생성',
          reservationType: 'REGULAR',
          participationAvailable: true,
          creatorId: superAdminMemberId,
        },
        superAdminMemberId,
      ),
    );

    expect(result).toEqual({
      message: '예약이 성공적으로 생성되었습니다.',
    });

    const row = await prisma.reservation.findFirst({
      where: { title: '통합-관리자-생성' },
      select: { reservationId: true, creatorId: true },
    });
    expect(row).not.toBeNull();
    trackReservationId(row!.reservationId);
    expect(row!.creatorId).toBe(superAdminMemberId);
    expect(
      eventPublisher.sendAdminForceCancelledNotification,
    ).not.toHaveBeenCalled();
  });

  it('EXTERNAL 예약은 externalCreatorName으로 저장된다', async () => {
    await handler.execute(
      new AdminForceCreateReservationCommand(
        {
          date: RESERVATION_DATE_YMD,
          startTime: '14:00',
          endTime: '15:00',
          title: '통합-외부예약',
          reservationType: 'EXTERNAL',
          participationAvailable: false,
          externalCreatorName: '외부 기관',
        },
        superAdminMemberId,
      ),
    );

    const row = await prisma.reservation.findFirst({
      where: { title: '통합-외부예약' },
      select: {
        reservationId: true,
        reservationType: true,
        externalCreatorName: true,
        creatorId: true,
      },
    });
    expect(row?.reservationType).toBe('EXTERNAL');
    expect(row?.externalCreatorName).toBe('외부 기관');
    expect(row?.creatorId).toBeNull();
    trackReservationId(row?.reservationId);
  });

  it('충돌 삭제 후 생성이 실패하면 롤백되고 취소 알림을 보내지 않는다', async () => {
    const conflictDate = AppKstDateTime.dateFormmatForDB(
      ROLLBACK_CONFLICT_DATE_YMD,
    );
    const existing = await repository.save(
      ReservationEntity.create({
        date: conflictDate,
        startTime: '10:00',
        endTime: '12:00',
        title: '통합-충돌롤백기존',
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
        new AdminForceCreateReservationCommand(
          {
            date: ROLLBACK_CONFLICT_DATE_YMD,
            startTime: '11:00',
            endTime: '13:00',
            title: '통합-충돌롤백실패',
            reservationType: 'REGULAR',
            participationAvailable: false,
            creatorId: 9_999_999_999,
          },
          superAdminMemberId,
        ),
      ),
    ).rejects.toThrow(BadRequestException);

    const stillExists = await prisma.reservation.findUnique({
      where: { reservationId: existing.reservationId! },
    });
    expect(stillExists).not.toBeNull();

    const failedCreate = await prisma.reservation.findFirst({
      where: { title: '통합-충돌롤백실패' },
    });
    expect(failedCreate).toBeNull();

    expect(
      eventPublisher.sendAdminForceCancelledNotification,
    ).not.toHaveBeenCalled();
  });

  it('시간 충돌 시 기존 예약을 삭제하고 참여자에게 취소 알림을 보낸다', async () => {
    const conflictDate = AppKstDateTime.dateFormmatForDB(CONFLICT_DATE_YMD);
    const existing = await repository.save(
      ReservationEntity.create({
        date: conflictDate,
        startTime: '10:00',
        endTime: '12:00',
        title: '통합-충돌기존',
        reservationType: 'REGULAR',
        participationAvailable: true,
        creator: buildConflictCreator(),
        participators: [buildConflictParticipator()],
        borrowInstruments: [],
      }),
    );
    trackReservationId(existing.reservationId);

    await handler.execute(
      new AdminForceCreateReservationCommand(
        {
          date: CONFLICT_DATE_YMD,
          startTime: '11:00',
          endTime: '13:00',
          title: '통합-관리자-충돌생성',
          reservationType: 'COMMON',
          participationAvailable: false,
          creatorId: superAdminMemberId,
        },
        superAdminMemberId,
      ),
    );

    const deleted = await prisma.reservation.findUnique({
      where: { reservationId: existing.reservationId! },
    });
    expect(deleted).toBeNull();

    const created = await prisma.reservation.findFirst({
      where: { title: '통합-관리자-충돌생성' },
      select: { reservationId: true },
    });
    trackReservationId(created?.reservationId);

    expect(
      eventPublisher.sendAdminForceCancelledNotification,
    ).toHaveBeenCalledWith({
      reservationId: existing.reservationId!,
      title: '통합-충돌기존',
      participatorIds: [conflictParticipatorMemberId],
    });
  });

  it('관리자가 아니면 UnauthorizedException이고 새 예약이 생기지 않는다', async () => {
    const beforeCount = await prisma.reservation.count({
      where: { title: '통합-관리자-무권한' },
    });

    await expect(
      handler.execute(
        new AdminForceCreateReservationCommand(
          {
            date: RESERVATION_DATE_YMD,
            startTime: '16:00',
            endTime: '17:00',
            title: '통합-관리자-무권한',
            reservationType: 'COMMON',
            participationAvailable: false,
          },
          nonAdminMemberId,
        ),
      ),
    ).rejects.toThrow(UnauthorizedException);

    const afterCount = await prisma.reservation.count({
      where: { title: '통합-관리자-무권한' },
    });
    expect(afterCount).toBe(beforeCount);
    expect(
      eventPublisher.sendAdminForceCancelledNotification,
    ).not.toHaveBeenCalled();
  });

  it('과거 날짜면 BadRequestException', async () => {
    await expect(
      handler.execute(
        new AdminForceCreateReservationCommand(
          {
            date: '2020-01-01',
            startTime: '10:00',
            endTime: '12:00',
            title: '통합-과거예약',
            reservationType: 'COMMON',
            participationAvailable: false,
          },
          superAdminMemberId,
        ),
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
