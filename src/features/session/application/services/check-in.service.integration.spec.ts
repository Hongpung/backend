import {
  afterAll,
  afterEach,
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
} from '../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { PrismaSessionRepository } from 'src/features/session/infrastructure/out/persistence/session.repository.impl';
import type { MemberForCheckInWithClubAndRoles } from '../ports/out/session.repository.port';
import type { SessionEventPublisherPort } from '../ports/out/session-event-publisher.port';
import type { SessionRuntimePort } from '../ports/out/session-runtime.port';
import { CheckInService } from './check-in.service';
import { RealtimeSession } from 'src/features/session/domain/entities/realtime-session.entity';
import { ReservationSession } from 'src/features/session/domain/entities/reservation-session.entity';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

const KST_BUSINESS_TIME = AppKstDateTime.parseKstDateTime('2030-06-15', '14:00');

describeIntegration('CheckInService (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaSessionRepository;
  let sessionRuntime: jest.Mocked<SessionRuntimePort>;
  let eventPublisher: jest.Mocked<
    Pick<SessionEventPublisherPort, 'publishSessionUpdate'>
  >;
  let service: CheckInService;

  const runId = Date.now();
  let testClubId: number;
  let memberWithClubId: number;
  let memberWithoutClubId: number;

  const email = (suffix: string) =>
    `check-in-svc-int-${runId}-${suffix}@integration.test`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new PrismaSessionRepository(
      prisma as unknown as PrismaService,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 46_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `check-in-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const withClub = await prisma.member.create({
      data: {
        email: email('with-club'),
        password: 'pw',
        name: '체크인회원',
        nickname: '닉네임',
        enrollmentNumber: `check-in-int-${runId}-wc`,
        clubId: testClubId,
      },
    });
    memberWithClubId = withClub.memberId;

    const withoutClub = await prisma.member.create({
      data: {
        email: email('no-club'),
        password: 'pw',
        name: '무소속회원',
        enrollmentNumber: `check-in-int-${runId}-nc`,
        clubId: null,
      },
    });
    memberWithoutClubId = withoutClub.memberId;

    await prisma.roleAssignment.create({
      data: {
        clubId: testClubId,
        memberId: memberWithClubId,
        role: 'SANGSOE',
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.roleAssignment.deleteMany({ where: { clubId: testClubId } });
    await prisma.member.deleteMany({
      where: {
        memberId: { in: [memberWithClubId, memberWithoutClubId] },
      },
    });
    await prisma.club.delete({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  beforeEach(() => {
    jest.spyOn(AppKstDateTime, 'kstHourFromInstant').mockReturnValue(14);

    sessionRuntime = {
      getCurrentSessionStatus: jest.fn(() => null),
      getNextReservationSession: jest.fn(() => null),
      isAlreadyAttendUser: jest.fn(() => false),
      isExtendAtMaxCap: jest.fn(() => false),
      getExtendMaxCapBlockedReason: jest.fn(() => null),
      startRealTimeSession: jest.fn(async () => undefined),
      startReservationSession: jest.fn(async () => undefined),
      attendToSession: jest.fn(async () => ({ status: '참가' as const })),
      extendSession: jest.fn(async () => undefined),
      endSession: jest.fn(async () => undefined),
      forceEndSessionIfMatching: jest.fn(async () => false),
      getOnairAttendanceMemberIds: jest.fn(() => []),
      getSessionById: jest.fn(() => null),
    };

    eventPublisher = {
      publishSessionUpdate: jest.fn(),
    };

    service = new CheckInService(
      eventPublisher as unknown as SessionEventPublisherPort,
      repository,
      sessionRuntime as unknown as SessionRuntimePort,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tryStartSession은 CREATABLE일 때 CREATED를 반환하고 실시간 세션을 시작한다', async () => {
    const result = await service.tryStartSession(memberWithClubId, true);

    expect(result).toEqual({ status: 'CREATED' });
    expect(sessionRuntime.startRealTimeSession).toHaveBeenCalledTimes(1);
    expect(sessionRuntime.startRealTimeSession).toHaveBeenCalledWith(
      expect.objectContaining({
        participationAvailable: true,
        creatorId: memberWithClubId,
        creatorName: '체크인회원',
      }),
    );
    expect(eventPublisher.publishSessionUpdate).toHaveBeenCalledTimes(1);
  });

  it('동아리·역할이 없는 회원은 tryStartSession에서 UnauthorizedException', async () => {
    await expect(service.tryStartSession(memberWithoutClubId)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(sessionRuntime.startRealTimeSession).not.toHaveBeenCalled();
    expect(eventPublisher.publishSessionUpdate).not.toHaveBeenCalled();
  });

  it('attendToSession은 참여 가능 세션에서 성공 상태를 반환한다', async () => {
    const member = await repository.findMemberForCheckIn(memberWithClubId);
    expect(member).not.toBeNull();
    expect(member!.club).not.toBeNull();

    const sessionUser = repository.toSessionUserFromCheckInMember(
      member as MemberForCheckInWithClubAndRoles,
    );

    const onAirSession = RealtimeSession.create({
      participationAvailable: true,
      attendanceList: [
        {
          user: sessionUser,
          status: '참가',
          timeStamp: KST_BUSINESS_TIME,
        },
      ],
      creatorName: sessionUser.name,
      creatorId: sessionUser.memberId,
      creatorNickname: sessionUser.nickname,
    });

    sessionRuntime.getCurrentSessionStatus.mockReturnValue(onAirSession);

    const result = await service.attendToSession(memberWithClubId);

    expect(result).toEqual({ status: '참가' });
    expect(sessionRuntime.attendToSession).toHaveBeenCalledWith(sessionUser);
    expect(eventPublisher.publishSessionUpdate).toHaveBeenCalledTimes(1);
  });

  it('tryStartSession은 STARTABLE일 때 STARTED를 반환하고 예약 세션을 시작한다', async () => {
    const member = await repository.findMemberForCheckIn(memberWithClubId);
    expect(member).not.toBeNull();
    expect(member!.club).not.toBeNull();

    const sessionUser = repository.toSessionUserFromCheckInMember(
      member as MemberForCheckInWithClubAndRoles,
    );

    const nextReservation = ReservationSession.create({
      reservationId: 99_001,
      reservationType: 'REGULAR',
      date: '2030-06-15',
      startTime: '14:00',
      endTime: '15:00',
      title: '예약연습',
      participationAvailable: true,
      creatorName: sessionUser.name,
      creatorId: sessionUser.memberId,
      participators: [sessionUser],
      participatorIds: [memberWithClubId],
      attendanceList: [],
    });

    sessionRuntime.getCurrentSessionStatus.mockReturnValue(null);
    sessionRuntime.getNextReservationSession.mockReturnValue(nextReservation);

    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(KST_BUSINESS_TIME.getTime());

    const result = await service.tryStartSession(memberWithClubId);

    expect(result).toEqual({ status: 'STARTED' });
    expect(sessionRuntime.startReservationSession).toHaveBeenCalledTimes(1);
    expect(sessionRuntime.startReservationSession).toHaveBeenCalledWith(
      sessionUser,
    );
    expect(sessionRuntime.startRealTimeSession).not.toHaveBeenCalled();
    expect(eventPublisher.publishSessionUpdate).toHaveBeenCalledTimes(1);

    nowSpy.mockRestore();
  });

  it('tryStartSession은 CREATABLE·STARTABLE이 아닌 간격이면 FAILED를 반환한다', async () => {
    const member = await repository.findMemberForCheckIn(memberWithClubId);
    expect(member).not.toBeNull();

    const sessionUser = repository.toSessionUserFromCheckInMember(
      member as MemberForCheckInWithClubAndRoles,
    );

    const nextReservation = ReservationSession.create({
      reservationId: 99_002,
      reservationType: 'REGULAR',
      date: '2030-06-15',
      startTime: '14:00',
      endTime: '15:00',
      title: '예약연습',
      participationAvailable: true,
      creatorName: sessionUser.name,
      creatorId: sessionUser.memberId,
      participators: [sessionUser],
      participatorIds: [memberWithClubId],
      attendanceList: [],
    });

    sessionRuntime.getCurrentSessionStatus.mockReturnValue(null);
    sessionRuntime.getNextReservationSession.mockReturnValue(nextReservation);

    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(KST_BUSINESS_TIME.getTime() - 20 * 60 * 1000);

    const result = await service.tryStartSession(memberWithClubId);

    expect(result).toEqual({ status: 'FAILED' });
    expect(sessionRuntime.startRealTimeSession).not.toHaveBeenCalled();
    expect(sessionRuntime.startReservationSession).not.toHaveBeenCalled();
    expect(eventPublisher.publishSessionUpdate).not.toHaveBeenCalled();

    nowSpy.mockRestore();
  });

  it('attendToSession은 참여 불가 세션에서 실패 상태를 반환한다', async () => {
    const member = await repository.findMemberForCheckIn(memberWithClubId);
    expect(member).not.toBeNull();
    expect(member!.club).not.toBeNull();

    const sessionUser = repository.toSessionUserFromCheckInMember(
      member as MemberForCheckInWithClubAndRoles,
    );

    const onAirSession = RealtimeSession.create({
      participationAvailable: false,
      attendanceList: [
        {
          user: sessionUser,
          status: '참가',
          timeStamp: KST_BUSINESS_TIME,
        },
      ],
      creatorName: sessionUser.name,
      creatorId: sessionUser.memberId,
      creatorNickname: sessionUser.nickname,
    });

    sessionRuntime.getCurrentSessionStatus.mockReturnValue(onAirSession);

    const result = await service.attendToSession(memberWithClubId);

    expect(result).toEqual({ status: '실패' });
    expect(sessionRuntime.attendToSession).not.toHaveBeenCalled();
    expect(eventPublisher.publishSessionUpdate).not.toHaveBeenCalled();
  });

  it('attendToSession은 동아리·역할 없는 회원에서 NotFoundException', async () => {
    const member = await repository.findMemberForCheckIn(memberWithClubId);
    expect(member).not.toBeNull();

    const sessionUser = repository.toSessionUserFromCheckInMember(
      member as MemberForCheckInWithClubAndRoles,
    );

    const onAirSession = RealtimeSession.create({
      participationAvailable: true,
      attendanceList: [
        {
          user: sessionUser,
          status: '참가',
          timeStamp: KST_BUSINESS_TIME,
        },
      ],
      creatorName: sessionUser.name,
      creatorId: sessionUser.memberId,
      creatorNickname: sessionUser.nickname,
    });

    sessionRuntime.getCurrentSessionStatus.mockReturnValue(onAirSession);

    await expect(service.attendToSession(memberWithoutClubId)).rejects.toThrow(
      NotFoundException,
    );
    expect(sessionRuntime.attendToSession).not.toHaveBeenCalled();
    expect(eventPublisher.publishSessionUpdate).not.toHaveBeenCalled();
  });
});
