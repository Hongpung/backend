import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import { RPC_KEY } from 'src/contracts/rpc/rpc-keys';
import type { SessionLogPersistRpcRequest } from 'src/contracts/rpc/session-log-persist.rpc';
import { SessionLogPersistService } from 'src/features/session-log/application/session-log-persist.service';
import { SessionLogRollbackService } from 'src/features/session-log/application/session-log-rollback.service';
import { SessionLogPersistRpcHandler } from 'src/features/session-log/infrastructure/in/rpc/session-log-persist.rpc-handler';
import { SessionLogRollbackRpcHandler } from 'src/features/session-log/infrastructure/in/rpc/session-log-rollback.rpc-handler';
import { EndSessionRecordRpcClient } from 'src/features/session/infrastructure/out/rpc/end-session-record.rpc-client';
import { InProcessRpcBus } from './in-process-rpc.bus';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../test/prisma/integration-test-database';
import {
  createSessionLogCommandIntegrationFixture,
  type SessionLogCommandIntegrationFixture,
} from '../../../test/features/session-log/session-log-command.integration.fixture';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('SessionEndRpc (cross-feature 통합)', () => {
  let prisma: PrismaClient;
  let fixture: SessionLogCommandIntegrationFixture;
  let client: EndSessionRecordRpcClient;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    fixture = await createSessionLogCommandIntegrationFixture(prisma, {
      emailPrefix: 'session-end-rpc-int',
      clubIdOffset: 54_000,
    });

    const rpcBus = new InProcessRpcBus();
    const persistService = new SessionLogPersistService(fixture.commandRepo);
    const rollbackService = new SessionLogRollbackService(fixture.commandRepo);

    new SessionLogPersistRpcHandler(rpcBus, persistService).onModuleInit();
    new SessionLogRollbackRpcHandler(rpcBus, rollbackService).onModuleInit();

    client = new EndSessionRecordRpcClient(rpcBus);
  });

  afterEach(async () => {
    await fixture.cleanupTrackedSessions();
  });

  afterAll(async () => {
    if (!prisma) return;

    await fixture.teardownAll();
    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('S-I02 / SL-I06 session-end RPC round-trip', () => {
    it('REALTIME persist round-trip: client.record → created, sessionId·mapping 일치', async () => {
      const runtimeSessionId = fixture.nextRuntimeSessionId();
      const request = fixture.buildPersistCommand({
        runtimeSessionId,
        sessionType: 'REALTIME',
        reservationType: null,
        reservationId: null,
      }) as SessionLogPersistRpcRequest;

      const result = await client.record(request);

      expect(result.status).toBe('created');
      if (result.status !== 'created') return;

      fixture.trackSession(result.sessionLog.sessionId);

      const mapping = await prisma.sessionRuntimeMapping.findUnique({
        where: { runtimeSessionId },
      });
      expect(mapping).not.toBeNull();
      expect(mapping!.sessionId).toBe(result.sessionLog.sessionId);

      const sessionRow = await prisma.session.findUnique({
        where: { sessionId: result.sessionLog.sessionId },
      });
      expect(sessionRow).not.toBeNull();
      expect(sessionRow!.sessionType).toBe('REALTIME');
    });

    it('persist 후 rollback round-trip: session·mapping·출석·대여 cascade 삭제', async () => {
      const runtimeSessionId = fixture.nextRuntimeSessionId();
      const request = fixture.buildPersistCommand({
        runtimeSessionId,
      }) as SessionLogPersistRpcRequest;

      const persistResult = await client.record(request);

      expect(persistResult.status).toBe('created');
      if (persistResult.status !== 'created') return;

      const sessionId = persistResult.sessionLog.sessionId;

      await client.rollback(runtimeSessionId);

      const sessionRow = await prisma.session.findUnique({
        where: { sessionId },
      });
      expect(sessionRow).toBeNull();

      const mappingRow = await prisma.sessionRuntimeMapping.findUnique({
        where: { runtimeSessionId },
      });
      expect(mappingRow).toBeNull();

      const attendanceCount = await prisma.attendance.count({
        where: { sessionId },
      });
      expect(attendanceCount).toBe(0);

      const borrowCount = await prisma.borrowedInstrument.count({
        where: { sessionId },
      });
      expect(borrowCount).toBe(0);
    });

    it('RESERVED+EXTERNAL은 skipped·EXTERNAL_RESERVATION·DB 무쓰기', async () => {
      const runtimeSessionId = fixture.nextRuntimeSessionId();
      const sessionCountBefore = await prisma.session.count();
      const mappingCountBefore = await prisma.sessionRuntimeMapping.count();

      const request = fixture.buildPersistCommand({
        runtimeSessionId,
        sessionType: 'RESERVED',
        reservationType: 'EXTERNAL',
        reservationId: fixture.reservedReservationId,
      }) as SessionLogPersistRpcRequest;

      const result = await client.record(request);

      expect(result).toEqual({
        status: 'skipped',
        skipReason: 'EXTERNAL_RESERVATION',
      });

      const mapping = await prisma.sessionRuntimeMapping.findUnique({
        where: { runtimeSessionId },
      });
      expect(mapping).toBeNull();

      const sessionCountAfter = await prisma.session.count();
      const mappingCountAfter = await prisma.sessionRuntimeMapping.count();
      expect(sessionCountAfter).toBe(sessionCountBefore);
      expect(mappingCountAfter).toBe(mappingCountBefore);
    });
  });

  describe('timeout', () => {
    it('30초 초과 시 failed·SESSION_LOG_RPC_TIMEOUT을 반환한다', async () => {
      jest.useFakeTimers();

      try {
        const timeoutBus = new InProcessRpcBus();
        timeoutBus.register(RPC_KEY.SESSION_LOG_PERSIST, () => new Promise(() => {}));
        const timeoutClient = new EndSessionRecordRpcClient(timeoutBus);

        const request = fixture.buildPersistCommand() as SessionLogPersistRpcRequest;
        const recordPromise = timeoutClient.record(request);

        await jest.advanceTimersByTimeAsync(30_001);

        const result = await recordPromise;

        expect(result).toEqual({
          status: 'failed',
          errorCode: 'SESSION_LOG_RPC_TIMEOUT',
        });
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
