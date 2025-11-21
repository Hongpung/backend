import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ConflictException } from '@nestjs/common';
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
import type { ReservationEventPublisherPort } from 'src/features/reservation/application/ports/out/reservation-event-publisher.port';
import { CreateReservationHandler } from './create-reservation.handler';
import { CreateReservationCommand } from '../create-reservation.command';
import { CreateReservationPolicyService } from '../../services/create-reservation-policy.service';
import { CreateReservationResourceLoaderService } from '../../services/create-reservation-resource-loader.service';
import { ReservationCreatedEventPublisherService } from '../../services/reservation-created-event-publisher.service';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const RESERVATION_DATE_YMD = '2030-06-15';
const CONFLICT_DATE_YMD = '2030-06-16';
const INSTRUMENT_PARTICIPATOR_DATE_YMD = '2030-06-17';

describeIntegration('CreateReservationHandler (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaReservationRepository;
  let handler: CreateReservationHandler;
  let eventPublisher: jest.Mocked<
    Pick<ReservationEventPublisherPort, 'sendCreatedInviteNotification'>
  >;

  const runId = Date.now();
  let testClubId: number;
  let creatorMemberId: number;
  let participatorMemberId: number;
  let instrumentId: number;

  const createdReservationIds: number[] = [];

  const email = (suffix: string) =>
    `create-handler-int-${runId}-${suffix}@integration.test`;

  function trackReservationId(id: number | undefined) {
    if (id !== undefined) createdReservationIds.push(id);
    return id;
  }

  function buildCreator(): ReservationCreator {
    return ReservationCreator.create({
      memberId: creatorMemberId,
      name: '통합생성자',
      nickname: null,
      email: email('creator'),
      enrollmentNumber: `create-int-${runId}-c`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `create-int-club-${testClubId}`,
      roles: ['LEADER'],
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
          ? `create-int-${runId}-c`
          : `create-int-${runId}-p`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `create-int-club-${testClubId}`,
      roles: memberId === creatorMemberId ? ['LEADER'] : [],
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
    const policyService = new CreateReservationPolicyService();

    eventPublisher = {
      sendCreatedInviteNotification: jest.fn(),
    };

    const createdEventPublisher = new ReservationCreatedEventPublisherService(
      eventPublisher as unknown as ReservationEventPublisherPort,
    );

    handler = new CreateReservationHandler(
      repository,
      policyService,
      resourceLoader,
      createdEventPublisher,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 43_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `create-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const creator = await prisma.member.create({
      data: {
        email: email('creator'),
        password: 'pw',
        name: '통합생성자',
        enrollmentNumber: `create-int-${runId}-c`,
        clubId: testClubId,
      },
    });
    creatorMemberId = creator.memberId;

    const participator = await prisma.member.create({
      data: {
        email: email('participator'),
        password: 'pw',
        name: '통합참여자',
        enrollmentNumber: `create-int-${runId}-p`,
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
        name: `create-int-janggu-${runId}`,
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('정상 생성 시 DB에 예약이 저장되고 알림 이벤트를 발행한다', async () => {
    const result = await handler.execute(
      new CreateReservationCommand(
        {
          date: RESERVATION_DATE_YMD,
          startTime: '10:00',
          endTime: '12:00',
          title: '통합-핸들러-생성',
          reservationType: 'REGULAR',
          participationAvailable: true,
          participatorIds: [participatorMemberId],
          borrowInstrumentIds: [],
        },
        creatorMemberId,
      ),
    );

    trackReservationId(result.reservationId);

    expect(result.reservationId).toBeDefined();

    const row = await prisma.reservation.findUnique({
      where: { reservationId: result.reservationId },
      select: {
        title: true,
        creatorId: true,
        date: true,
        startTime: true,
        endTime: true,
      },
    });
    expect(row?.title).toBe('통합-핸들러-생성');
    expect(row?.creatorId).toBe(creatorMemberId);

    const withParticipators = await prisma.reservation.findUnique({
      where: { reservationId: result.reservationId },
      include: { participators: { select: { memberId: true } } },
    });
    expect(
      withParticipators?.participators.map((p) => p.memberId).sort(),
    ).toEqual([creatorMemberId, participatorMemberId].sort((a, b) => a - b));

    expect(eventPublisher.sendCreatedInviteNotification).toHaveBeenCalledWith({
      reservationId: result.reservationId,
      title: expect.any(String),
      participatorIds: [participatorMemberId],
    });
  });

  it('시간 충돌이 있으면 ConflictException이고 새 예약 행이 생기지 않는다', async () => {
    const conflictDate = AppKstDateTime.dateFormmatForDB(CONFLICT_DATE_YMD);
    const existing = await repository.save(
      ReservationEntity.create({
        date: conflictDate,
        startTime: '10:00',
        endTime: '12:00',
        title: '통합-기존충돌',
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
    trackReservationId(existing.reservationId);

    const beforeCount = await prisma.reservation.count({
      where: { title: '통합-핸들러-충돌시도' },
    });

    await expect(
      handler.execute(
        new CreateReservationCommand(
          {
            date: CONFLICT_DATE_YMD,
            startTime: '11:00',
            endTime: '13:00',
            title: '통합-핸들러-충돌시도',
            reservationType: 'COMMON',
            participationAvailable: true,
            participatorIds: [],
            borrowInstrumentIds: [],
          },
          creatorMemberId,
        ),
      ),
    ).rejects.toThrow(ConflictException);

    const afterCount = await prisma.reservation.count({
      where: { title: '통합-핸들러-충돌시도' },
    });
    expect(afterCount).toBe(beforeCount);
    expect(eventPublisher.sendCreatedInviteNotification).not.toHaveBeenCalled();
  });

  it('participator와 borrowInstrument를 포함해 생성하면 DB relation과 초대 알림 payload를 검증한다', async () => {
    const result = await handler.execute(
      new CreateReservationCommand(
        {
          date: INSTRUMENT_PARTICIPATOR_DATE_YMD,
          startTime: '10:00',
          endTime: '12:00',
          title: '통합-핸들러-참여-악기',
          reservationType: 'REGULAR',
          participationAvailable: true,
          participatorIds: [participatorMemberId],
          borrowInstrumentIds: [instrumentId],
        },
        creatorMemberId,
      ),
    );

    trackReservationId(result.reservationId);

    expect(result.reservationId).toBeDefined();

    const row = await prisma.reservation.findUnique({
      where: { reservationId: result.reservationId },
      include: {
        participators: { select: { memberId: true } },
        borrowInstruments: {
          select: {
            instrumentId: true,
            borrowAvailable: true,
            name: true,
          },
        },
      },
    });

    expect(
      row?.participators.map((p) => p.memberId).sort((a, b) => a - b),
    ).toEqual(
      [creatorMemberId, participatorMemberId].sort((a, b) => a - b),
    );

    expect(row?.borrowInstruments).toHaveLength(1);
    expect(row?.borrowInstruments[0]).toMatchObject({
      instrumentId,
      borrowAvailable: true,
      name: `create-int-janggu-${runId}`,
    });

    expect(eventPublisher.sendCreatedInviteNotification).toHaveBeenCalledTimes(
      1,
    );
    expect(eventPublisher.sendCreatedInviteNotification).toHaveBeenCalledWith({
      reservationId: result.reservationId,
      title: '통합-핸들러-참여-악기',
      participatorIds: [participatorMemberId],
    });
  });
});
