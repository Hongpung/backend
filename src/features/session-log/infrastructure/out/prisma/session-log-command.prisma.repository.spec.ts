import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { SessionLogCommandPrismaRepository } from './session-log-command.prisma.repository';

type AnyJestMock = jest.Mock<any>;

type PrismaSessionLogCommandTestDouble = {
  sessionRuntimeMapping: { findUnique: AnyJestMock };
  sessionRuntimeMappingOnTx: { findUnique: AnyJestMock };
  session: {
    create: AnyJestMock;
    findUnique: AnyJestMock;
    update: AnyJestMock;
    delete: AnyJestMock;
  };
  attendance: {
    findMany: AnyJestMock;
    create: AnyJestMock;
    update: AnyJestMock;
    deleteMany: AnyJestMock;
  };
  $transaction: AnyJestMock;
};

function buildPrismaMock(): PrismaSessionLogCommandTestDouble {
  const session = {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const attendance = {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  };
  attendance.findMany.mockResolvedValue([] as never);
  const sessionRuntimeMappingOnTx = { findUnique: jest.fn() };
  sessionRuntimeMappingOnTx.findUnique.mockResolvedValue(null as never);
  const tx = { session, attendance, sessionRuntimeMapping: sessionRuntimeMappingOnTx };
  const sessionRuntimeMapping = { findUnique: jest.fn() };
  return {
    sessionRuntimeMapping,
    sessionRuntimeMappingOnTx,
    session,
    attendance,
    $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
  };
}

function buildSnapshotPayload() {
  return {
    runtimeSessionId: 'rt-persist-1',
    date: new Date('2026-04-22T00:00:00.000Z'),
    startTime: new Date('2026-04-22T01:00:00.000Z'),
    endTime: new Date('2026-04-22T02:00:00.000Z'),
    creatorId: 1,
    title: 'Practice',
    sessionType: 'RESERVED',
    reservationType: 'REGULAR',
    reservationId: 10,
    extendCount: 0,
    participationAvailable: true,
    returnImageUrl: null,
    forceEnd: false,
    attendanceList: [
      {
        memberId: 2,
        status: '참가',
        timeStamp: new Date('2026-04-22T01:30:00.000Z'),
      },
    ],
    borrowInstruments: [
      {
        instrumentId: 3,
        instrumentSnapshot: '{"name":"drum"}',
      },
    ],
  };
}

function buildDetailRow(sessionId: number) {
  return {
    sessionId,
    creatorId: 1,
    creatorName: 'Creator',
    creatorNickname: null,
    title: 'Practice',
    date: new Date('2026-04-22T00:00:00.000Z'),
    startTime: new Date('2026-04-22T01:00:00.000Z'),
    endTime: new Date('2026-04-22T02:00:00.000Z'),
    sessionType: 'RESERVED',
    reservationType: 'REGULAR',
    reservationId: 10,
    participationAvailable: true,
    forceEnd: false,
    extendCount: 0,
    returnImageUrl: null,
    attendanceList: [],
    borrowInstruments: [],
    creator: null,
    _count: { attendanceList: 0 },
  };
}

describe('SessionLogCommandPrismaRepository', () => {
  let prisma: PrismaSessionLogCommandTestDouble;
  let repository: SessionLogCommandPrismaRepository;

  beforeEach(() => {
    prisma = buildPrismaMock();
    prisma.sessionRuntimeMapping.findUnique.mockResolvedValue(null as never);
    prisma.sessionRuntimeMappingOnTx.findUnique.mockResolvedValue(null as never);
    prisma.session.create.mockResolvedValue({ sessionId: 42 } as never);
    prisma.session.findUnique.mockImplementation(async (args: {
      where: { sessionId?: number; reservationId?: number };
    }) => {
      if (args.where.reservationId != null) {
        return null;
      }
      if (args.where.sessionId === 42) {
        return buildDetailRow(42) as never;
      }
      return null;
    });
    repository = new SessionLogCommandPrismaRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('persist는 단일 transaction 안에서 create·detail 조회까지 수행한다', async () => {
    const payload = buildSnapshotPayload();

    const detail = await repository.persistSessionFromSnapshot(payload);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.session.create).toHaveBeenCalledTimes(1);
    expect(prisma.session.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sessionId: 42 } }),
    );
    expect(detail.sessionId).toBe(42);
  });

  it('기존 runtime mapping이 있으면 transaction 안에서 sync 후 detail을 반환한다', async () => {
    prisma.sessionRuntimeMappingOnTx.findUnique.mockResolvedValue({
      sessionId: 99,
    } as never);
    prisma.session.findUnique.mockResolvedValue(buildDetailRow(99) as never);

    const payload = buildSnapshotPayload();
    const detail = await repository.persistSessionFromSnapshot(payload);

    expect(detail.sessionId).toBe(99);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.session.create).not.toHaveBeenCalled();
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { sessionId: 99 },
      data: {
        endTime: payload.endTime,
        extendCount: payload.extendCount,
        forceEnd: payload.forceEnd,
      },
    });
    expect(prisma.attendance.create).toHaveBeenCalledWith({
      data: {
        sessionId: 99,
        memberId: 2,
        status: '참가',
        timeStamp: payload.attendanceList[0].timeStamp,
      },
    });
  });

  it('멱등 동기화 시 기존 출석은 status·timeStamp를 갱신한다', async () => {
    prisma.sessionRuntimeMappingOnTx.findUnique.mockResolvedValue({
      sessionId: 99,
    } as never);
    prisma.attendance.findMany.mockResolvedValue([
      { attendanceId: 7, memberId: 2 },
    ] as never);
    prisma.session.findUnique.mockResolvedValue(buildDetailRow(99) as never);

    const payload = buildSnapshotPayload();
    payload.attendanceList[0].status = '출석';

    await repository.persistSessionFromSnapshot(payload);

    expect(prisma.attendance.update).toHaveBeenCalledWith({
      where: { attendanceId: 7 },
      data: {
        status: '출석',
        timeStamp: payload.attendanceList[0].timeStamp,
      },
    });
    expect(prisma.attendance.create).not.toHaveBeenCalled();
  });

  it('멱등 동기화 시 스냅샷에 없는 출석 row는 삭제한다', async () => {
    prisma.sessionRuntimeMappingOnTx.findUnique.mockResolvedValue({
      sessionId: 99,
    } as never);
    prisma.attendance.findMany.mockResolvedValue([
      { attendanceId: 7, memberId: 2 },
      { attendanceId: 8, memberId: 5 },
    ] as never);
    prisma.session.findUnique.mockResolvedValue(buildDetailRow(99) as never);

    await repository.persistSessionFromSnapshot(buildSnapshotPayload());

    expect(prisma.attendance.deleteMany).toHaveBeenCalledWith({
      where: { attendanceId: { in: [8] } },
    });
  });

  it('transaction 내 detail 조회 실패 시 전체가 롤백된다', async () => {
    prisma.session.findUnique.mockResolvedValue(null as never);

    await expect(
      repository.persistSessionFromSnapshot(buildSnapshotPayload()),
    ).rejects.toThrow('Session log row missing after persist');
  });

  it('deleteByRuntimeSessionId는 매핑이 있으면 session을 삭제한다', async () => {
    prisma.sessionRuntimeMapping.findUnique.mockResolvedValue({
      sessionId: 99,
    } as never);
    prisma.session.delete.mockResolvedValue({ sessionId: 99 } as never);

    const deleted = await repository.deleteByRuntimeSessionId('rt-persist-1');

    expect(deleted).toBe(true);
    expect(prisma.session.delete).toHaveBeenCalledWith({
      where: { sessionId: 99 },
    });
  });

  it('session.create 실패 시 transaction이 reject한다', async () => {
    const dbError = new Error('create failed');
    prisma.sessionRuntimeMappingOnTx.findUnique.mockResolvedValue(null as never);
    prisma.session.findUnique.mockImplementation(async (args: {
      where: { sessionId?: number; reservationId?: number };
    }) => {
      if (args.where.reservationId != null) {
        return null;
      }
      return null;
    });
    prisma.session.create.mockRejectedValue(dbError);

    await expect(
      repository.persistSessionFromSnapshot(buildSnapshotPayload()),
    ).rejects.toThrow(dbError);
  });

  it('session.create가 P2002면 기존 mapping을 찾아 update로 멱등 동기화한다', async () => {
    let mappingLookupCount = 0;
    prisma.sessionRuntimeMappingOnTx.findUnique.mockImplementation(async () => {
      mappingLookupCount += 1;
      if (mappingLookupCount === 1) {
        return null as never;
      }
      return { sessionId: 99 } as never;
    });

    const p2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '6.0.0' },
    );
    prisma.session.create.mockRejectedValue(p2002);
    prisma.session.findUnique.mockImplementation(async (args: {
      where: { sessionId?: number; reservationId?: number };
    }) => {
      if (args.where.reservationId != null) {
        return null;
      }
      if (args.where.sessionId === 99) {
        return buildDetailRow(99) as never;
      }
      return null;
    });

    const payload = buildSnapshotPayload();
    const detail = await repository.persistSessionFromSnapshot(payload);

    expect(prisma.session.create).toHaveBeenCalledTimes(1);
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { sessionId: 99 },
      data: {
        endTime: payload.endTime,
        extendCount: payload.extendCount,
        forceEnd: payload.forceEnd,
      },
    });
    expect(detail.sessionId).toBe(99);
  });

  it('기존 runtime mapping이 있고 forceEnd가 true이면 session.update에 forceEnd를 반영한다', async () => {
    prisma.sessionRuntimeMappingOnTx.findUnique.mockResolvedValue({
      sessionId: 99,
    } as never);
    prisma.session.findUnique.mockResolvedValue(buildDetailRow(99) as never);

    const payload = buildSnapshotPayload();
    payload.forceEnd = true;

    await repository.persistSessionFromSnapshot(payload);

    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { sessionId: 99 },
      data: {
        endTime: payload.endTime,
        extendCount: payload.extendCount,
        forceEnd: true,
      },
    });
  });
});
