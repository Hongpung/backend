import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../test/prisma/integration-test-database';
import { PrismaService } from './prisma.service';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration(
  'PrismaService 통합 스모크 (INTEGRATION_TEST=1 및 TEST_DATABASE_URL이 설정된 경우에만 실행)',
  () => {
    let prisma: PrismaService;

    beforeAll(async () => {
      const client = await connectIntegrationTestDatabase();
      prisma = client as unknown as PrismaService;
    });

    afterAll(async () => {
      if (prisma) {
        await disconnectIntegrationTestDatabase(prisma);
      }
    });

    it('DB에 연결해 간단한 쿼리를 실행할 수 있다', async () => {
      const rows = await prisma.$queryRaw<
        Array<{ ok: bigint }>
      >`SELECT 1 AS ok`;
      expect(rows[0]?.ok).toBe(1n);
    });
  },
);
