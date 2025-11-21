import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ConflictException, ForbiddenException } from '@nestjs/common';
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
import { UpdateReservationHandler } from './update-reservation.handler';
import { UpdateReservationCommand } from '../update-reservation.command';
import { CreateReservationResourceLoaderService } from '../../services/create-reservation-resource-loader.service';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const RESERVATION_DATE_YMD = '2030-06-15';
const RESERVATION_DATE = AppKstDateTime.dateFormmatForDB(RESERVATION_DATE_YMD);
const CONFLICT_DATE_YMD = '2030-06-16';
const CONFLICT_DATE = AppKstDateTime.dateFormmatForDB(CONFLICT_DATE_YMD);
const MOVED_DATE_YMD = '2030-06-17';

describeIntegration('UpdateReservationHandler (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaReservationRepository;
  let handler: UpdateReservationHandler;
  let eventPublisher: jest.Mocked<
    Pick<ReservationEventPublisherPort, 'sendReservationUpdatedNotification'>
  >;

  const runId = Date.now();
  let testClubId: number;
  let creatorMemberId: number;
  let otherMemberId: number;
  let participatorMemberId: number;

  const createdReservationIds: number[] = [];

  const email = (suffix: string) =>
    `update-handler-int-${runId}-${suffix}@integration.test`;

  function trackReservationId(id: number | undefined) {
    if (id !== undefined) createdReservationIds.push(id);
    return id;
  }

  function buildCreator(memberId: number): ReservationCreator {
    return ReservationCreator.create({
      memberId,
      name: memberId === creatorMemberId ? '수정생성자' : '다른회원',
      nickname: null,
      email: email(memberId === creatorMemberId ? 'creator' : 'other'),
      enrollmentNumber: `update-int-${runId}-${memberId}`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `update-int-club-${testClubId}`,
      roles: memberId === creatorMemberId ? ['LEADER'] : [],
    });
  }

  function buildParticipator(memberId: number): ReservationParticipator {
    const isCreator = memberId === creatorMemberId;
    const isParticipator = memberId === participatorMemberId;
    return ReservationParticipator.create({
      memberId,
      name: isCreator ? '수정생성자' : isParticipator ? '수정참여자' : '다른회원',
      nickname: null,
      email: email(
        isCreator ? 'creator' : isParticipator ? 'participator' : 'other',
      ),
      enrollmentNumber: `update-int-${runId}-${memberId}`,
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      clubName: `update-int-club-${testClubId}`,
      roles: isCreator ? ['LEADER'] : [],
    });
  }

  async function seedInternalReservation(
    overrides: Partial<{
      date: Date;
      startTime: string;
      endTime: string;
      title: string;
      creatorMemberId: number;
      participatorIds: number[];
    }> = {},
  ): Promise<number> {
    const creatorId = overrides.creatorMemberId ?? creatorMemberId;
    const participatorIds = overrides.participatorIds ?? [
      creatorMemberId,
      participatorMemberId,
    ];

    const saved = await repository.save(
      ReservationEntity.create({
        date: overrides.date ?? RESERVATION_DATE,
        startTime: overrides.startTime ?? '10:00',
        endTime: overrides.endTime ?? '12:00',
        title: overrides.title ?? '통합-수정대상',
        reservationType: 'REGULAR',
        participationAvailable: true,
        creator: buildCreator(creatorId),
        participators: participatorIds.map((id) => buildParticipator(id)),
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

    eventPublisher = {
      sendReservationUpdatedNotification: jest.fn(async () => undefined),
    };

    handler = new UpdateReservationHandler(
      repository,
      eventPublisher as unknown as ReservationEventPublisherPort,
      resourceLoader,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 44_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `update-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const creator = await prisma.member.create({
      data: {
        email: email('creator'),
        password: 'pw',
        name: '수정생성자',
        enrollmentNumber: `update-int-${runId}-c`,
        clubId: testClubId,
      },
    });
    creatorMemberId = creator.memberId;

    const participator = await prisma.member.create({
      data: {
        email: email('participator'),
        password: 'pw',
        name: '수정참여자',
        enrollmentNumber: `update-int-${runId}-p`,
        clubId: testClubId,
      },
    });
    participatorMemberId = participator.memberId;

    const other = await prisma.member.create({
      data: {
        email: email('other'),
        password: 'pw',
        name: '다른회원',
        enrollmentNumber: `update-int-${runId}-o`,
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

  it('제목 변경 시 DB에 반영되고 수정 이벤트를 발행한다', async () => {
    const reservationId = await seedInternalReservation();

    await expect(
      handler.execute(
        new UpdateReservationCommand(reservationId, creatorMemberId, {
          title: '통합-제목변경',
        }),
      ),
    ).resolves.toEqual({ message: '예약이 성공적으로 수정되었습니다.' });

    const row = await prisma.reservation.findUnique({
      where: { reservationId },
      select: { title: true },
    });
    expect(row?.title).toBe('통합-제목변경');

    expect(
      eventPublisher.sendReservationUpdatedNotification,
    ).toHaveBeenCalledWith({
      reservationId,
      updatedBy: creatorMemberId,
      changes: { title: '통합-제목변경' },
      affectedMemberIds: [participatorMemberId],
      reservationTitle: '통합-제목변경',
    });
  });

  it('생성자가 아니면 ForbiddenException이고 DB는 변경되지 않는다', async () => {
    const reservationId = await seedInternalReservation({
      title: '통합-권한검증',
    });

    await expect(
      handler.execute(
        new UpdateReservationCommand(reservationId, otherMemberId, {
          title: '침해시도',
        }),
      ),
    ).rejects.toThrow(ForbiddenException);

    const row = await prisma.reservation.findUnique({
      where: { reservationId },
      select: { title: true },
    });
    expect(row?.title).toBe('통합-권한검증');
    expect(
      eventPublisher.sendReservationUpdatedNotification,
    ).not.toHaveBeenCalled();
  });

  it('시간 겹침이 있으면 ConflictException이고 DB 시간은 유지된다', async () => {
    const firstId = await seedInternalReservation({
      date: CONFLICT_DATE,
      startTime: '10:00',
      endTime: '12:00',
      title: '통합-충돌A',
    });
    const secondId = await seedInternalReservation({
      date: CONFLICT_DATE,
      startTime: '14:00',
      endTime: '15:00',
      title: '통합-충돌B',
    });

    await expect(
      handler.execute(
        new UpdateReservationCommand(secondId, creatorMemberId, {
          startTime: '11:00',
          endTime: '12:30',
        }),
      ),
    ).rejects.toThrow(ConflictException);

    const unchanged = await repository.findReservationById(secondId);
    expect(unchanged?.startTime).toBe('14:00');
    expect(unchanged?.endTime).toBe('15:00');
    expect(
      eventPublisher.sendReservationUpdatedNotification,
    ).not.toHaveBeenCalled();

    void firstId;
  });

  it('날짜·예약타입·참여가능 여부 변경 시 DB에 반영된다', async () => {
    const reservationId = await seedInternalReservation();

    await handler.execute(
      new UpdateReservationCommand(reservationId, creatorMemberId, {
        date: MOVED_DATE_YMD,
        reservationType: 'COMMON',
        participationAvailable: false,
      }),
    );

    const row = await prisma.reservation.findUnique({
      where: { reservationId },
      select: {
        date: true,
        reservationType: true,
        participationAvailable: true,
      },
    });
    expect(AppKstDateTime.kstCalendarYmdFromDbOrString(row!.date)).toBe(
      MOVED_DATE_YMD,
    );
    expect(row?.reservationType).toBe('COMMON');
    expect(row?.participationAvailable).toBe(false);

    expect(
      eventPublisher.sendReservationUpdatedNotification,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: {
          date: MOVED_DATE_YMD,
          reservationType: 'COMMON',
          participationAvailable: false,
        },
      }),
    );
  });

  it('participatorIds로 참가자 목록을 전체 교체한다', async () => {
    const reservationId = await seedInternalReservation();

    await handler.execute(
      new UpdateReservationCommand(reservationId, creatorMemberId, {
        participatorIds: [creatorMemberId, otherMemberId],
      }),
    );

    const row = await prisma.reservation.findUnique({
      where: { reservationId },
      select: {
        participators: { select: { memberId: true }, orderBy: { memberId: 'asc' } },
      },
    });
    expect(row?.participators.map((p) => p.memberId)).toEqual(
      [creatorMemberId, otherMemberId].sort((a, b) => a - b),
    );

    expect(
      eventPublisher.sendReservationUpdatedNotification,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        changes: { participatorIds: [creatorMemberId, otherMemberId] },
        affectedMemberIds: expect.arrayContaining([
          otherMemberId,
          participatorMemberId,
        ]),
      }),
    );
  });
});
