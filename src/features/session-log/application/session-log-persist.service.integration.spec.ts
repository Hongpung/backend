import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import {
  createSessionLogCommandIntegrationFixture,
  SESSION_LOG_INTEGRATION_SESSION_DATE_YMD,
  type SessionLogCommandIntegrationFixture,
} from '../../../../test/features/session-log/session-log-command.integration.fixture';
import { SessionLogPersistService } from './session-log-persist.service';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('SessionLogPersistService (통합)', () => {
  let prisma: PrismaClient;
  let fixture: SessionLogCommandIntegrationFixture;
  let persistService: SessionLogPersistService;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    fixture = await createSessionLogCommandIntegrationFixture(prisma, {
      emailPrefix: 'session-log-persist-svc-int',
      clubIdOffset: 52_000,
    });
    persistService = new SessionLogPersistService(fixture.commandRepo);
  });

  afterEach(async () => {
    await fixture.cleanupTrackedSessions();
  });

  afterAll(async () => {
    if (!prisma) return;

    await fixture.teardownAll();
    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('SL-I04 persistFromSnapshot — application orchestration', () => {
    it('RESERVED+EXTERNAL 예약은 skipped를 반환하고 DB에 쓰지 않는다', async () => {
      const runtimeSessionId = fixture.nextRuntimeSessionId();
      const sessionCountBefore = await prisma.session.count();
      const mappingCountBefore = await prisma.sessionRuntimeMapping.count();

      const result = await persistService.persistFromSnapshot(
        fixture.buildPersistCommand({
          runtimeSessionId,
          sessionType: 'RESERVED',
          reservationType: 'EXTERNAL',
          reservationId: fixture.reservedReservationId,
        }),
      );

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

    it('REALTIME 빈 attendanceList는 failed를 반환하고 DB에 쓰지 않는다', async () => {
      const runtimeSessionId = fixture.nextRuntimeSessionId();
      const sessionCountBefore = await prisma.session.count();

      const result = await persistService.persistFromSnapshot(
        fixture.buildPersistCommand({
          runtimeSessionId,
          sessionType: 'REALTIME',
          reservationType: null,
          reservationId: null,
          attendanceList: [],
        }),
      );

      expect(result).toEqual({
        status: 'failed',
        errorCode: 'SESSION_LOG_PERSIST_FAILED',
      });

      const mapping = await prisma.sessionRuntimeMapping.findUnique({
        where: { runtimeSessionId },
      });
      expect(mapping).toBeNull();

      const sessionCountAfter = await prisma.session.count();
      expect(sessionCountAfter).toBe(sessionCountBefore);
    });

    it('정상 persist 시 created와 read model·DB row·mapping·출석을 반환한다', async () => {
      const runtimeSessionId = fixture.nextRuntimeSessionId();
      const payload = fixture.buildPersistCommand({
        runtimeSessionId,
        sessionType: 'REALTIME',
        reservationType: null,
        reservationId: null,
      });

      const result = await persistService.persistFromSnapshot(payload);

      expect(result.status).toBe('created');
      if (result.status !== 'created') return;

      const detail = result.sessionLog;
      fixture.trackSession(detail.sessionId);

      const mapping = await prisma.sessionRuntimeMapping.findUnique({
        where: { runtimeSessionId },
      });
      expect(mapping).not.toBeNull();
      expect(mapping!.sessionId).toBe(detail.sessionId);

      const sessionRow = await prisma.session.findUnique({
        where: { sessionId: detail.sessionId },
      });
      expect(sessionRow).not.toBeNull();
      expect(sessionRow!.sessionType).toBe('REALTIME');
      expect(sessionRow!.title).toBe(payload.title);

      const attendanceRows = await prisma.attendance.findMany({
        where: { sessionId: detail.sessionId },
        orderBy: { memberId: 'asc' },
      });
      expect(attendanceRows).toHaveLength(2);
      expect(attendanceRows.map((row) => row.memberId)).toEqual([
        fixture.attendeeMemberId1,
        fixture.attendeeMemberId2,
      ]);

      const borrowRows = await prisma.borrowedInstrument.findMany({
        where: { sessionId: detail.sessionId },
      });
      expect(borrowRows).toHaveLength(1);
      expect(borrowRows[0]!.instrumentId).toBe(fixture.testInstrumentId);

      expect(detail.sessionId).toBeGreaterThan(0);
      expect(detail.sessionType).toBe('REALTIME');
      expect(detail.reservationId).toBeNull();
      expect(detail.title).toBe(payload.title);
      expect(detail.date).toBe(SESSION_LOG_INTEGRATION_SESSION_DATE_YMD);
      expect(detail.startTime).toBe('14:00');
      expect(detail.endTime).toBe('16:00');
      expect(detail.attendanceList).toHaveLength(2);
      expect(detail.attendanceList[0]!.member.memberId).toBe(
        fixture.attendeeMemberId1,
      );
      expect(detail.borrowInstruments).toHaveLength(1);
      expect(detail.borrowInstruments[0]!.name).toBe('통합테스트 북');
      expect(detail.borrowInstruments[0]!.instrumentType).toBe('BUK');
      expect(detail.borrowInstruments[0]!.club).toBe(
        `session-log-int-club-${fixture.testClubId}`,
      );
      expect(detail.attendeeCount).toBe(2);
    });
  });
});
