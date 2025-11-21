import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
import { LeaveReservationHandler } from './leave-reservation.handler';
import { LeaveReservationCommand } from '../leave-reservation.command';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const RESERVATION_DATE_YMD = '2030-06-15';
const RESERVATION_DATE = AppKstDateTime.dateFormmatForDB(RESERVATION_DATE_YMD);

describeIntegration('LeaveReservationHandler (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaReservationRepository;
  let handler: LeaveReservationHandler;
  let eventPublisher: jest.Mocked<
    Pick<ReservationEventPublisherPort, 'sendLeaveNotification'>
  >;

  const runId = Date.now();
  let testClubId: number;
  let creatorMemberId: number;
  let participatorMemberId: number;
  let secondParticipatorMemberId: number;
  let outsiderMemberId: number;

  const createdReservationIds: number[] = [];

  const email = (suffix: string) =>
    `leave-handler-int-${runId}-${suffix}@integration.test`;

  function trackReservationId(id: number | undefined) {
    if (id !== undefined) createdReservationIds.push(id);
    return id;
  }

  function buildCreator(): ReservationCreator {
    return ReservationCreator.create({
      memberId: creatorMemberId,
      name: '탈퇴생성자',
      nickname: null,
      email: email('creator'),
      enrollmentNumber: `leave-int-${runId}-c`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `leave-int-club-${testClubId}`,
      roles: ['LEADER'],
    });
  }

  function buildParticipator(memberId: number, label: 'p1' | 'p2'): ReservationParticipator {
    const isCreator = memberId === creatorMemberId;
    return ReservationParticipator.create({
      memberId,
      name: isCreator ? '탈퇴생성자' : label === 'p1' ? '탈퇴참여1' : '탈퇴참여2',
      nickname: null,
      email: isCreator ? email('creator') : email(label),
      enrollmentNumber: `leave-int-${runId}-${label}`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `leave-int-club-${testClubId}`,
      roles: isCreator ? ['LEADER'] : [],
    });
  }

  async function seedReservation(): Promise<number> {
    const saved = await repository.save(
      ReservationEntity.create({
        date: RESERVATION_DATE,
        startTime: '10:00',
        endTime: '12:00',
        title: '통합-탈퇴대상',
        reservationType: 'REGULAR',
        participationAvailable: true,
        creator: buildCreator(),
        participators: [
          buildParticipator(creatorMemberId, 'p1'),
          buildParticipator(participatorMemberId, 'p1'),
          buildParticipator(secondParticipatorMemberId, 'p2'),
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
      sendLeaveNotification: jest.fn(async () => undefined),
    };

    handler = new LeaveReservationHandler(
      repository,
      eventPublisher as unknown as ReservationEventPublisherPort,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 47_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `leave-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const creator = await prisma.member.create({
      data: {
        email: email('creator'),
        password: 'pw',
        name: '탈퇴생성자',
        enrollmentNumber: `leave-int-${runId}-c`,
        clubId: testClubId,
      },
    });
    creatorMemberId = creator.memberId;

    const participator1 = await prisma.member.create({
      data: {
        email: email('p1'),
        password: 'pw',
        name: '탈퇴참여1',
        enrollmentNumber: `leave-int-${runId}-p1`,
        clubId: testClubId,
      },
    });
    participatorMemberId = participator1.memberId;

    const participator2 = await prisma.member.create({
      data: {
        email: email('p2'),
        password: 'pw',
        name: '탈퇴참여2',
        enrollmentNumber: `leave-int-${runId}-p2`,
        clubId: testClubId,
      },
    });
    secondParticipatorMemberId = participator2.memberId;

    const outsider = await prisma.member.create({
      data: {
        email: email('outsider'),
        password: 'pw',
        name: '비참여회원',
        enrollmentNumber: `leave-int-${runId}-o`,
        clubId: testClubId,
      },
    });
    outsiderMemberId = outsider.memberId;

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
            creatorMemberId,
            participatorMemberId,
            secondParticipatorMemberId,
            outsiderMemberId,
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

  it('참여자 탈퇴 시 DB에서 제거되고 participatorLeft 이벤트를 발행한다', async () => {
    const reservationId = await seedReservation();

    await expect(
      handler.execute(
        new LeaveReservationCommand(reservationId, participatorMemberId),
      ),
    ).resolves.toEqual({ message: '예약에서 제외됐어요.' });

    const row = await prisma.reservation.findUnique({
      where: { reservationId },
      include: { participators: { select: { memberId: true } } },
    });
    expect(row?.participators.map((p) => p.memberId).sort()).toEqual(
      [creatorMemberId, secondParticipatorMemberId].sort((a, b) => a - b),
    );

    expect(eventPublisher.sendLeaveNotification).toHaveBeenCalledWith(
      expect.anything(),
      participatorMemberId,
    );
  });

  it('예약이 없으면 NotFoundException', async () => {
    await expect(
      handler.execute(new LeaveReservationCommand(9_999_999_999, participatorMemberId)),
    ).rejects.toThrow(NotFoundException);
    expect(eventPublisher.sendLeaveNotification).not.toHaveBeenCalled();
  });

  it('참여자가 아니면 NotFoundException이고 participator 행은 유지된다', async () => {
    const reservationId = await seedReservation();
    const beforeCount = (
      await prisma.reservation.findUnique({
        where: { reservationId },
        include: { participators: { select: { memberId: true } } },
      })
    )?.participators.length;

    await expect(
      handler.execute(new LeaveReservationCommand(reservationId, outsiderMemberId)),
    ).rejects.toThrow(NotFoundException);

    const afterCount = (
      await prisma.reservation.findUnique({
        where: { reservationId },
        include: { participators: { select: { memberId: true } } },
      })
    )?.participators.length;
    expect(afterCount).toBe(beforeCount);
    expect(eventPublisher.sendLeaveNotification).not.toHaveBeenCalled();
  });

  it('생성자가 나가려 하면 ForbiddenException이고 participator 행은 유지된다', async () => {
    const reservationId = await seedReservation();
    const beforeCount = (
      await prisma.reservation.findUnique({
        where: { reservationId },
        include: { participators: { select: { memberId: true } } },
      })
    )?.participators.length;

    await expect(
      handler.execute(new LeaveReservationCommand(reservationId, creatorMemberId)),
    ).rejects.toThrow(ForbiddenException);

    const afterCount = (
      await prisma.reservation.findUnique({
        where: { reservationId },
        include: { participators: { select: { memberId: true } } },
      })
    )?.participators.length;
    expect(afterCount).toBe(beforeCount);
    expect(eventPublisher.sendLeaveNotification).not.toHaveBeenCalled();
  });
});
