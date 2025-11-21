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
import { PrismaReservationRepository } from 'src/features/reservation/infrastructure/out/prisma/reservation.repository.impl';
import { ReservationAdminLookupAdapter } from 'src/features/reservation/infrastructure/out/adapters/reservation-admin-lookup.adapter';
import { AdminLevelLookupService } from 'src/features/admin/application/use-case/admin-level-lookup.use-case';
import { PrismaAdminRepository } from 'src/features/admin/infrastructure/out/prisma/admin.prisma.repository';
import type { ReservationEventPublisherPort } from 'src/features/reservation/application/ports/out/reservation-event-publisher.port';
import { AdminForceDeleteReservationHandler } from './admin-force-delete-reservation.handler';
import { AdminForceDeleteReservationCommand } from '../admin-force-delete-reservation.command';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const RESERVATION_DATE_YMD = '2030-06-15';
const RESERVATION_DATE = AppKstDateTime.dateFormmatForDB(RESERVATION_DATE_YMD);

describeIntegration('AdminForceDeleteReservationHandler (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaReservationRepository;
  let handler: AdminForceDeleteReservationHandler;
  let eventPublisher: jest.Mocked<
    Pick<ReservationEventPublisherPort, 'sendAdminForceCancelledNotification'>
  >;

  const runId = Date.now();
  let testClubId: number;
  let superAdminMemberId: number;
  let nonAdminMemberId: number;
  let creatorMemberId: number;
  let participatorMemberId: number;

  const createdReservationIds: number[] = [];

  const email = (suffix: string) =>
    `admin-delete-int-${runId}-${suffix}@integration.test`;

  function trackReservationId(id: number | undefined) {
    if (id !== undefined) createdReservationIds.push(id);
    return id;
  }

  function buildCreator(): ReservationCreator {
    return ReservationCreator.create({
      memberId: creatorMemberId,
      name: '삭제생성자',
      nickname: null,
      email: email('creator'),
      enrollmentNumber: `admin-delete-int-${runId}-c`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `admin-delete-int-club-${testClubId}`,
      roles: ['LEADER'],
    });
  }

  function buildParticipator(): ReservationParticipator {
    return ReservationParticipator.create({
      memberId: participatorMemberId,
      name: '삭제참여자',
      nickname: null,
      email: email('participator'),
      enrollmentNumber: `admin-delete-int-${runId}-p`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `admin-delete-int-club-${testClubId}`,
      roles: [],
    });
  }

  async function seedReservation(): Promise<number> {
    const saved = await repository.save(
      ReservationEntity.create({
        date: RESERVATION_DATE,
        startTime: '10:00',
        endTime: '12:00',
        title: '통합-관리자삭제대상',
        reservationType: 'REGULAR',
        participationAvailable: true,
        creator: buildCreator(),
        participators: [buildParticipator()],
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

    const adminLevelLookup = new AdminLevelLookupService(
      new PrismaAdminRepository(prisma as unknown as PrismaService),
    );
    const adminLookup = new ReservationAdminLookupAdapter(adminLevelLookup);

    eventPublisher = {
      sendAdminForceCancelledNotification: jest.fn(),
    };

    handler = new AdminForceDeleteReservationHandler(
      repository,
      eventPublisher as unknown as ReservationEventPublisherPort,
      adminLookup,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 50_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `admin-delete-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const superAdmin = await prisma.member.create({
      data: {
        email: email('super'),
        password: 'pw',
        name: '슈퍼관리자',
        enrollmentNumber: `admin-delete-int-${runId}-sa`,
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
        enrollmentNumber: `admin-delete-int-${runId}-u`,
        clubId: testClubId,
      },
    });
    nonAdminMemberId = nonAdmin.memberId;

    const creator = await prisma.member.create({
      data: {
        email: email('creator'),
        password: 'pw',
        name: '삭제생성자',
        enrollmentNumber: `admin-delete-int-${runId}-c`,
        clubId: testClubId,
      },
    });
    creatorMemberId = creator.memberId;

    const participator = await prisma.member.create({
      data: {
        email: email('participator'),
        password: 'pw',
        name: '삭제참여자',
        enrollmentNumber: `admin-delete-int-${runId}-p`,
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
          in: [superAdminMemberId, nonAdminMemberId, creatorMemberId, participatorMemberId],
        },
      },
    });
    await prisma.club.delete({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('SUPER 관리자는 예약을 삭제하고 참여자에게 취소 알림을 보낸다', async () => {
    const reservationId = await seedReservation();

    await expect(
      handler.execute(
        new AdminForceDeleteReservationCommand(reservationId, superAdminMemberId),
      ),
    ).resolves.toEqual({ message: '삭제 성공' });

    const row = await prisma.reservation.findUnique({
      where: { reservationId },
    });
    expect(row).toBeNull();

    createdReservationIds.splice(createdReservationIds.indexOf(reservationId), 1);

    expect(
      eventPublisher.sendAdminForceCancelledNotification,
    ).toHaveBeenCalledWith({
      reservationId,
      title: '통합-관리자삭제대상',
      participatorIds: [participatorMemberId],
    });
  });

  it('관리자가 아니면 UnauthorizedException이고 예약 행은 유지된다', async () => {
    const reservationId = await seedReservation();

    await expect(
      handler.execute(
        new AdminForceDeleteReservationCommand(reservationId, nonAdminMemberId),
      ),
    ).rejects.toThrow(UnauthorizedException);

    const row = await prisma.reservation.findUnique({
      where: { reservationId },
      select: { title: true },
    });
    expect(row?.title).toBe('통합-관리자삭제대상');
    expect(
      eventPublisher.sendAdminForceCancelledNotification,
    ).not.toHaveBeenCalled();
  });

  it('예약이 없으면 NotFoundException', async () => {
    await expect(
      handler.execute(
        new AdminForceDeleteReservationCommand(9_999_999_999, superAdminMemberId),
      ),
    ).rejects.toThrow(NotFoundException);
    expect(
      eventPublisher.sendAdminForceCancelledNotification,
    ).not.toHaveBeenCalled();
  });
});
