import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import {
  createSessionLogCommandIntegrationFixture,
  type SessionLogCommandIntegrationFixture,
} from '../../../../test/features/session-log/session-log-command.integration.fixture';
import { SessionLogPersistService } from './session-log-persist.service';
import { SessionLogRollbackService } from './session-log-rollback.service';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('SessionLogRollbackService (통합)', () => {
  let prisma: PrismaClient;
  let fixture: SessionLogCommandIntegrationFixture;
  let persistService: SessionLogPersistService;
  let rollbackService: SessionLogRollbackService;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    fixture = await createSessionLogCommandIntegrationFixture(prisma, {
      emailPrefix: 'session-log-rollback-svc-int',
      clubIdOffset: 53_000,
    });
    persistService = new SessionLogPersistService(fixture.commandRepo);
    rollbackService = new SessionLogRollbackService(fixture.commandRepo);
  });

  afterEach(async () => {
    await fixture.cleanupTrackedSessions();
  });

  afterAll(async () => {
    if (!prisma) return;

    await fixture.teardownAll();
    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('SL-I05 rollbackByRuntimeSessionId — application orchestration', () => {
    it('persist 후 rollback하면 deleted=true이고 session·mapping·출석·대여가 cascade 삭제된다', async () => {
      const runtimeSessionId = fixture.nextRuntimeSessionId();
      const persistResult = await persistService.persistFromSnapshot(
        fixture.buildPersistCommand({ runtimeSessionId }),
      );

      expect(persistResult.status).toBe('created');
      if (persistResult.status !== 'created') return;

      const sessionId = persistResult.sessionLog.sessionId;

      const rollbackResult =
        await rollbackService.rollbackByRuntimeSessionId(runtimeSessionId);

      expect(rollbackResult).toEqual({ deleted: true });

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

    it('존재하지 않는 runtimeSessionId rollback은 deleted=false를 반환한다', async () => {
      const result = await rollbackService.rollbackByRuntimeSessionId(
        randomUUID(),
      );

      expect(result).toEqual({ deleted: false });
    });
  });
});
