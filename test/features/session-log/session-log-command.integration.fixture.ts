import { randomUUID } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { PersistSessionLogCommand } from 'src/features/session-log/application/commands/persist-session-log.command';
import { SessionLogCommandPrismaRepository } from 'src/features/session-log/infrastructure/out/prisma/session-log-command.prisma.repository';

export const SESSION_LOG_INTEGRATION_SESSION_DATE_YMD = '2031-06-15';
export const SESSION_LOG_INTEGRATION_RESERVED_DATE_YMD = '2031-06-16';

export type SessionLogCommandIntegrationFixtureOptions = {
  emailPrefix: string;
  clubIdOffset: number;
};

export type SessionLogCommandIntegrationFixture = {
  commandRepo: SessionLogCommandPrismaRepository;
  runId: number;
  testClubId: number;
  creatorMemberId: number;
  attendeeMemberId1: number;
  attendeeMemberId2: number;
  testInstrumentId: number;
  reservedReservationId: number;
  reservedReservationId2: number;
  trackedSessionIds: number[];
  email: (suffix: string) => string;
  nextRuntimeSessionId: () => string;
  trackSession: (sessionId: number) => void;
  buildPersistCommand: (
    overrides?: Partial<PersistSessionLogCommand>,
  ) => PersistSessionLogCommand;
  cleanupTrackedSessions: () => Promise<void>;
  teardownAll: () => Promise<void>;
};

export async function createSessionLogCommandIntegrationFixture(
  prisma: PrismaClient,
  options: SessionLogCommandIntegrationFixtureOptions,
): Promise<SessionLogCommandIntegrationFixture> {
  const runId = Date.now();
  const trackedSessionIds: number[] = [];

  const email = (suffix: string) =>
    `${options.emailPrefix}-${runId}-${suffix}@integration.test`;

  const nextRuntimeSessionId = () => randomUUID();

  const trackSession = (sessionId: number) => {
    if (!trackedSessionIds.includes(sessionId)) {
      trackedSessionIds.push(sessionId);
    }
  };

  const commandRepo = new SessionLogCommandPrismaRepository(
    prisma as unknown as PrismaService,
  );

  const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
  const testClubId = (maxClub._max.clubId ?? 0) + options.clubIdOffset;

  await prisma.club.create({
    data: {
      clubId: testClubId,
      clubName: `session-log-int-club-${testClubId}`,
      profileImageUrl: null,
    },
  });

  const creator = await prisma.member.create({
    data: {
      email: email('creator'),
      password: 'pw',
      name: '세션생성자',
      nickname: '생성자닉',
      enrollmentNumber: `${options.emailPrefix}-${runId}-cr`,
      clubId: testClubId,
    },
  });
  const creatorMemberId = creator.memberId;

  const attendee1 = await prisma.member.create({
    data: {
      email: email('attendee-1'),
      password: 'pw',
      name: '출석자1',
      enrollmentNumber: `${options.emailPrefix}-${runId}-a1`,
      clubId: testClubId,
    },
  });
  const attendeeMemberId1 = attendee1.memberId;

  const attendee2 = await prisma.member.create({
    data: {
      email: email('attendee-2'),
      password: 'pw',
      name: '출석자2',
      enrollmentNumber: `${options.emailPrefix}-${runId}-a2`,
      clubId: testClubId,
    },
  });
  const attendeeMemberId2 = attendee2.memberId;

  await prisma.roleAssignment.create({
    data: {
      clubId: testClubId,
      memberId: creatorMemberId,
      role: 'SANGSOE',
    },
  });

  const instrument = await prisma.instrument.create({
    data: {
      instrumentType: 'BUK',
      clubId: testClubId,
      name: '통합테스트 북',
      imageUrl: 'https://cdn.test/buk.png',
      borrowAvailable: true,
    },
  });
  const testInstrumentId = instrument.instrumentId;

  const reservation = await prisma.reservation.create({
    data: {
      date: AppKstDateTime.dateFormmatForDB(
        SESSION_LOG_INTEGRATION_RESERVED_DATE_YMD,
      ),
      startTime: AppKstDateTime.timeFormmatForDB('10:00'),
      endTime: AppKstDateTime.timeFormmatForDB('12:00'),
      title: `session-log-reserved-${runId}`,
      reservationType: 'REGULAR',
      participationAvailable: true,
      creatorId: creatorMemberId,
    },
  });
  const reservedReservationId = reservation.reservationId;

  const reservation2 = await prisma.reservation.create({
    data: {
      date: AppKstDateTime.dateFormmatForDB(
        SESSION_LOG_INTEGRATION_RESERVED_DATE_YMD,
      ),
      startTime: AppKstDateTime.timeFormmatForDB('13:00'),
      endTime: AppKstDateTime.timeFormmatForDB('15:00'),
      title: `session-log-reserved-2-${runId}`,
      reservationType: 'REGULAR',
      participationAvailable: true,
      creatorId: creatorMemberId,
    },
  });
  const reservedReservationId2 = reservation2.reservationId;

  const buildPersistCommand = (
    overrides: Partial<PersistSessionLogCommand> = {},
  ): PersistSessionLogCommand => {
    const attendanceStamp = AppKstDateTime.getNowKoreanTime();

    return {
      runtimeSessionId: nextRuntimeSessionId(),
      date: AppKstDateTime.dateFormmatForDB(
        SESSION_LOG_INTEGRATION_SESSION_DATE_YMD,
      ),
      startTime: AppKstDateTime.timeFormmatForDB('14:00'),
      endTime: AppKstDateTime.timeFormmatForDB('16:00'),
      creatorId: creatorMemberId,
      title: `session-log-int-${runId}`,
      sessionType: 'REALTIME',
      reservationType: null,
      reservationId: null,
      extendCount: 0,
      participationAvailable: true,
      returnImageUrl: null,
      forceEnd: false,
      attendanceList: [
        {
          memberId: attendeeMemberId1,
          status: '출석',
          timeStamp: attendanceStamp,
        },
        {
          memberId: attendeeMemberId2,
          status: '지각',
          timeStamp: attendanceStamp,
        },
      ],
      borrowInstruments: [
        {
          instrumentId: testInstrumentId,
          instrumentSnapshot: JSON.stringify({
            name: '통합테스트 북',
            instrumentType: 'BUK',
          }),
        },
      ],
      ...overrides,
    };
  };

  const cleanupTrackedSessions = async () => {
    if (trackedSessionIds.length === 0) return;

    await prisma.session.deleteMany({
      where: { sessionId: { in: [...trackedSessionIds] } },
    });
    trackedSessionIds.length = 0;
  };

  const teardownAll = async () => {
    await prisma.session.deleteMany({
      where: {
        OR: [
          {
            reservationId: {
              in: [reservedReservationId, reservedReservationId2],
            },
          },
          { creatorId: creatorMemberId },
        ],
      },
    });
    await prisma.reservation.deleteMany({
      where: {
        reservationId: { in: [reservedReservationId, reservedReservationId2] },
      },
    });
    await prisma.instrument.deleteMany({
      where: { instrumentId: testInstrumentId },
    });
    await prisma.roleAssignment.deleteMany({ where: { clubId: testClubId } });
    await prisma.member.deleteMany({
      where: {
        memberId: {
          in: [creatorMemberId, attendeeMemberId1, attendeeMemberId2],
        },
      },
    });
    await prisma.club.delete({ where: { clubId: testClubId } });
  };

  return {
    commandRepo,
    runId,
    testClubId,
    creatorMemberId,
    attendeeMemberId1,
    attendeeMemberId2,
    testInstrumentId,
    reservedReservationId,
    reservedReservationId2,
    trackedSessionIds,
    email,
    nextRuntimeSessionId,
    trackSession,
    buildPersistCommand,
    cleanupTrackedSessions,
    teardownAll,
  };
}
