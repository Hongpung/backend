import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
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
import { AdminModifyReservationHandler } from './admin-modify-reservation.handler';
import { AdminModifyReservationCommand } from '../admin-modify-reservation.command';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const RESERVATION_DATE_YMD = '2030-06-15';
const CONFLICT_DATE_YMD = '2030-06-17';
const RESERVATION_DATE = AppKstDateTime.dateFormmatForDB(RESERVATION_DATE_YMD);

describeIntegration('AdminModifyReservationHandler (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaReservationRepository;
  let handler: AdminModifyReservationHandler;
  let eventPublisher: jest.Mocked<
    Pick<
      ReservationEventPublisherPort,
      | 'sendReservationUpdatedNotification'
      | 'sendAdminConflictCancelledNotification'
    >
  >;

  const runId = Date.now();
  let testClubId: number;
  let superAdminMemberId: number;
  let nonAdminMemberId: number;
  let creatorMemberId: number;
  let participatorMemberId: number;
  let conflictMemberId: number;

  const createdReservationIds: number[] = [];

  const email = (suffix: string) =>
    `admin-modify-int-${runId}-${suffix}@integration.test`;

  function trackReservationId(id: number | undefined) {
    if (id !== undefined) createdReservationIds.push(id);
    return id;
  }

  function buildCreator(memberId: number): ReservationCreator {
    return ReservationCreator.create({
      memberId,
      name: memberId === creatorMemberId ? '수정생성자' : '충돌회원',
      nickname: null,
      email: memberId === creatorMemberId ? email('creator') : email('conflict'),
      enrollmentNumber:
        memberId === creatorMemberId
          ? `admin-modify-int-${runId}-c`
          : `admin-modify-int-${runId}-cf`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `admin-modify-int-club-${testClubId}`,
      roles: memberId === creatorMemberId ? ['LEADER'] : [],
    });
  }

  function buildParticipator(memberId: number): ReservationParticipator {
    return ReservationParticipator.create({
      memberId,
      name: '수정참여자',
      nickname: null,
      email: email('participator'),
      enrollmentNumber: `admin-modify-int-${runId}-p`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `admin-modify-int-club-${testClubId}`,
      roles: [],
    });
  }

  async function seedReservation(title = '통합-수정대상'): Promise<number> {
    const saved = await repository.save(
      ReservationEntity.create({
        date: RESERVATION_DATE,
        startTime: '10:00',
        endTime: '12:00',
        title,
        reservationType: 'REGULAR',
        participationAvailable: true,
        creator: buildCreator(creatorMemberId),
        participators: [
          buildParticipator(creatorMemberId),
          buildParticipator(participatorMemberId),
        ],
        borrowInstruments: [],
      }),
    );
    return trackReservationId(saved.reservationId)!;
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
      sendReservationUpdatedNotification: jest.fn(async () => undefined),
      sendAdminConflictCancelledNotification: jest.fn(),
    };

    handler = new AdminModifyReservationHandler(
      repository,
      eventPublisher as unknown as ReservationEventPublisherPort,
      adminLookup,
      resourceLoader,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 49_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `admin-modify-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const superAdmin = await prisma.member.create({
      data: {
        email: email('super'),
        password: 'pw',
        name: '슈퍼관리자',
        enrollmentNumber: `admin-modify-int-${runId}-sa`,
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
        enrollmentNumber: `admin-modify-int-${runId}-u`,
        clubId: testClubId,
      },
    });
    nonAdminMemberId = nonAdmin.memberId;

    const creator = await prisma.member.create({
      data: {
        email: email('creator'),
        password: 'pw',
        name: '수정생성자',
        enrollmentNumber: `admin-modify-int-${runId}-c`,
        clubId: testClubId,
      },
    });
    creatorMemberId = creator.memberId;

    const participator = await prisma.member.create({
      data: {
        email: email('participator'),
        password: 'pw',
        name: '수정참여자',
        enrollmentNumber: `admin-modify-int-${runId}-p`,
        clubId: testClubId,
      },
    });
    participatorMemberId = participator.memberId;

    const conflict = await prisma.member.create({
      data: {
        email: email('conflict'),
        password: 'pw',
        name: '충돌회원',
        enrollmentNumber: `admin-modify-int-${runId}-cf`,
        clubId: testClubId,
      },
    });
    conflictMemberId = conflict.memberId;

    await prisma.roleAssignment.create({
      data: {
        clubId: testClubId,
        memberId: creatorMemberId,
        role: 'LEADER',
      },
    });
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
        memberId: {
          in: [
            superAdminMemberId,
            nonAdminMemberId,
            creatorMemberId,
            participatorMemberId,
            conflictMemberId,
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

  it('제목 변경 시 DB에 반영되고 updated 이벤트를 발행한다', async () => {
    const reservationId = await seedReservation();

    const result = await handler.execute(
      new AdminModifyReservationCommand(
        reservationId,
        superAdminMemberId,
        { title: '통합-수정완료' },
      ),
    );

    expect(result.message).toContain('예약이 성공적으로 수정되었습니다.');

    const row = await prisma.reservation.findUnique({
      where: { reservationId },
      select: { title: true },
    });
    expect(row?.title).toBe('통합-수정완료');

    expect(
      eventPublisher.sendReservationUpdatedNotification,
    ).toHaveBeenCalledWith({
      reservationId,
      updatedBy: superAdminMemberId,
      changes: { title: '통합-수정완료' },
      affectedMemberIds: [creatorMemberId, participatorMemberId],
      reservationTitle: '통합-수정완료',
    });
  });

  it('수정 후 시간 충돌 시 충돌 예약을 삭제하고 취소 알림을 보낸다', async () => {
    const conflictDate = AppKstDateTime.dateFormmatForDB(CONFLICT_DATE_YMD);
    const targetId = await seedReservation('통합-수정-충돌대상');

    const overlapping = await repository.save(
      ReservationEntity.create({
        date: conflictDate,
        startTime: '10:00',
        endTime: '12:00',
        title: '통합-수정-충돌기존',
        reservationType: 'COMMON',
        participationAvailable: true,
        creator: buildCreator(conflictMemberId),
        participators: [
          ReservationParticipator.create({
            memberId: conflictMemberId,
            name: '충돌회원',
            nickname: null,
            email: email('conflict'),
            enrollmentNumber: `admin-modify-int-${runId}-cf`,
            profileImageUrl: null,
            blogUrl: null,
            instagramUrl: null,
            clubName: `admin-modify-int-club-${testClubId}`,
            roles: [],
          }),
        ],
        borrowInstruments: [],
      }),
    );
    trackReservationId(overlapping.reservationId);

    await handler.execute(
      new AdminModifyReservationCommand(targetId, superAdminMemberId, {
        date: CONFLICT_DATE_YMD,
        startTime: '11:00',
        endTime: '13:00',
      }),
    );

    const deleted = await prisma.reservation.findUnique({
      where: { reservationId: overlapping.reservationId! },
    });
    expect(deleted).toBeNull();

    expect(
      eventPublisher.sendAdminConflictCancelledNotification,
    ).toHaveBeenCalledWith({
      reservationId: overlapping.reservationId!,
      title: '통합-수정-충돌기존',
      participatorIds: [conflictMemberId],
    });
  });

  it('충돌 삭제 후 수정 저장이 실패하면 롤백되고 알림을 보내지 않는다', async () => {
    const conflictDate = AppKstDateTime.dateFormmatForDB(CONFLICT_DATE_YMD);
    const targetId = await seedReservation('통합-수정-롤백대상');

    const overlapping = await repository.save(
      ReservationEntity.create({
        date: conflictDate,
        startTime: '10:00',
        endTime: '12:00',
        title: '통합-수정-롤백충돌',
        reservationType: 'COMMON',
        participationAvailable: true,
        creator: buildCreator(conflictMemberId),
        participators: [
          ReservationParticipator.create({
            memberId: conflictMemberId,
            name: '충돌회원',
            nickname: null,
            email: email('conflict'),
            enrollmentNumber: `admin-modify-int-${runId}-cf`,
            profileImageUrl: null,
            blogUrl: null,
            instagramUrl: null,
            clubName: `admin-modify-int-club-${testClubId}`,
            roles: [],
          }),
        ],
        borrowInstruments: [],
      }),
    );
    trackReservationId(overlapping.reservationId);

    const beforeTarget = await prisma.reservation.findUnique({
      where: { reservationId: targetId },
      select: { title: true, date: true, startTime: true, endTime: true },
    });

    const saveSpy = jest
      .spyOn(repository, 'save')
      .mockRejectedValueOnce(new Error('integration: forced save failure'));

    try {
      await expect(
        handler.execute(
          new AdminModifyReservationCommand(targetId, superAdminMemberId, {
            date: CONFLICT_DATE_YMD,
            startTime: '11:00',
            endTime: '13:00',
          }),
        ),
      ).rejects.toThrow('integration: forced save failure');
    } finally {
      saveSpy.mockRestore();
    }

    const stillExists = await prisma.reservation.findUnique({
      where: { reservationId: overlapping.reservationId! },
    });
    expect(stillExists).not.toBeNull();

    const afterTarget = await prisma.reservation.findUnique({
      where: { reservationId: targetId },
      select: { title: true, date: true, startTime: true, endTime: true },
    });
    expect(afterTarget).toEqual(beforeTarget);

    expect(
      eventPublisher.sendAdminConflictCancelledNotification,
    ).not.toHaveBeenCalled();
    expect(
      eventPublisher.sendReservationUpdatedNotification,
    ).not.toHaveBeenCalled();
  });

  it('관리자가 아니면 UnauthorizedException', async () => {
    const reservationId = await seedReservation('통합-수정-무권한');

    await expect(
      handler.execute(
        new AdminModifyReservationCommand(reservationId, nonAdminMemberId, {
          title: '변경시도',
        }),
      ),
    ).rejects.toThrow(UnauthorizedException);

    const row = await prisma.reservation.findUnique({
      where: { reservationId },
      select: { title: true },
    });
    expect(row?.title).toBe('통합-수정-무권한');
    expect(
      eventPublisher.sendReservationUpdatedNotification,
    ).not.toHaveBeenCalled();
    expect(
      eventPublisher.sendAdminConflictCancelledNotification,
    ).not.toHaveBeenCalled();
  });

  it('예약이 없으면 NotFoundException', async () => {
    await expect(
      handler.execute(
        new AdminModifyReservationCommand(9_999_999_999, superAdminMemberId, {
          title: '없음',
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
