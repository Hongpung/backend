import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { PrismaReservationRepository } from 'src/features/reservation/infrastructure/out/prisma/reservation.repository.impl';
import type { ReservationEventPublisherPort } from 'src/features/reservation/application/ports/out/reservation-event-publisher.port';
import { DeleteReservationHandler } from './delete-reservation.handler';
import { DeleteReservationCommand } from '../delete-reservation.command';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const RESERVATION_DATE_YMD = '2030-06-15';
const RESERVATION_DATE = AppKstDateTime.dateFormmatForDB(RESERVATION_DATE_YMD);

describeIntegration('DeleteReservationHandler (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaReservationRepository;
  let handler: DeleteReservationHandler;
  let eventPublisher: jest.Mocked<
    Pick<ReservationEventPublisherPort, 'sendReservationCanceledNotification'>
  >;

  const runId = Date.now();
  let testClubId: number;
  let creatorMemberId: number;
  let participatorMemberId: number;
  let otherMemberId: number;

  const createdReservationIds: number[] = [];

  const email = (suffix: string) =>
    `delete-handler-int-${runId}-${suffix}@integration.test`;

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
      enrollmentNumber: `delete-int-${runId}-c`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `delete-int-club-${testClubId}`,
      roles: ['LEADER'],
    });
  }

  function buildParticipator(memberId: number): ReservationParticipator {
    return ReservationParticipator.create({
      memberId,
      name: memberId === creatorMemberId ? '삭제생성자' : '삭제참여자',
      nickname: null,
      email:
        memberId === creatorMemberId ? email('creator') : email('participator'),
      enrollmentNumber:
        memberId === creatorMemberId
          ? `delete-int-${runId}-c`
          : `delete-int-${runId}-p`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `delete-int-club-${testClubId}`,
      roles: memberId === creatorMemberId ? ['LEADER'] : [],
    });
  }

  async function seedReservation(): Promise<number> {
    const saved = await repository.save(
      ReservationEntity.create({
        date: RESERVATION_DATE,
        startTime: '10:00',
        endTime: '12:00',
        title: '통합-삭제대상',
        reservationType: 'REGULAR',
        participationAvailable: true,
        creator: buildCreator(),
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

    eventPublisher = {
      sendReservationCanceledNotification: jest.fn(async () => undefined),
    };

    handler = new DeleteReservationHandler(
      repository,
      eventPublisher as unknown as ReservationEventPublisherPort,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 45_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `delete-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const creator = await prisma.member.create({
      data: {
        email: email('creator'),
        password: 'pw',
        name: '삭제생성자',
        enrollmentNumber: `delete-int-${runId}-c`,
        clubId: testClubId,
      },
    });
    creatorMemberId = creator.memberId;

    const participator = await prisma.member.create({
      data: {
        email: email('participator'),
        password: 'pw',
        name: '삭제참여자',
        enrollmentNumber: `delete-int-${runId}-p`,
        clubId: testClubId,
      },
    });
    participatorMemberId = participator.memberId;

    const other = await prisma.member.create({
      data: {
        email: email('other'),
        password: 'pw',
        name: '다른회원',
        enrollmentNumber: `delete-int-${runId}-o`,
        clubId: testClubId,
      },
    });
    otherMemberId = other.memberId;

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
        memberId: { in: [creatorMemberId, participatorMemberId, otherMemberId] },
      },
    });
    await prisma.club.delete({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('정상 삭제 시 DB에서 제거되고 알림 이벤트를 발행한다', async () => {
    const reservationId = await seedReservation();

    await expect(
      handler.execute(new DeleteReservationCommand(reservationId, creatorMemberId)),
    ).resolves.toEqual({ message: '예약이 성공적으로 삭제되었어요.' });

    const row = await prisma.reservation.findUnique({
      where: { reservationId },
    });
    expect(row).toBeNull();

    createdReservationIds.splice(
      createdReservationIds.indexOf(reservationId),
      1,
    );

    expect(
      eventPublisher.sendReservationCanceledNotification,
    ).toHaveBeenCalledWith(expect.anything(), [participatorMemberId]);
  });

  it('생성자가 아니면 ForbiddenException이고 예약 행은 유지된다', async () => {
    const reservationId = await seedReservation();

    await expect(
      handler.execute(new DeleteReservationCommand(reservationId, otherMemberId)),
    ).rejects.toThrow(ForbiddenException);

    const row = await prisma.reservation.findUnique({
      where: { reservationId },
      select: { title: true },
    });
    expect(row?.title).toBe('통합-삭제대상');
    expect(
      eventPublisher.sendReservationCanceledNotification,
    ).not.toHaveBeenCalled();
  });
});
