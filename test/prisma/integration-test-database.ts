import { PrismaClient } from '@prisma/client';
import { createPrismaClient } from '../../src/infrastructure/prisma/create-prisma-client';

/**
 * 통합 테스트 전용 DB URL (.env의 TEST_DATABASE_URL).
 * Prisma Client는 DATABASE_URL을 읽으므로 연결 직전에 applyIntegrationTestDatabaseEnv()로 매핑한다.
 */
export function getTestDatabaseUrl(): string | undefined {
  const url = process.env.TEST_DATABASE_URL?.trim();
  return url || undefined;
}

/**
 * 통합 테스트 실행 여부.
 * `INTEGRATION_TEST=1`과 `TEST_DATABASE_URL`이 모두 있을 때만 실 DB 스위트를 연다.
 */
export function isIntegrationDatabaseConfigured(): boolean {
  return process.env.INTEGRATION_TEST === '1' && Boolean(getTestDatabaseUrl());
}

/**
 * E2E(HTTP) 실행 여부.
 * 테스트 DB + Redis + `E2E_TEST=1`이 있을 때만 AppModule smoke를 연다.
 */
export function isE2eConfigured(): boolean {
  return (
    process.env.E2E_TEST === '1' &&
    isIntegrationDatabaseConfigured() &&
    Boolean(process.env.REDIS_HOST?.trim())
  );
}

/** Prisma CLI·Client가 사용할 DATABASE_URL을 테스트 DB로 덮어쓴다 */
export function applyIntegrationTestDatabaseEnv(): void {
  const testUrl = getTestDatabaseUrl();
  if (!testUrl) {
    return;
  }
  process.env.DATABASE_URL = testUrl;
}

/** TEST_DATABASE_URL이 있을 때만 PrismaClient를 연결해 반환한다 */
export async function connectIntegrationTestDatabase(): Promise<PrismaClient> {
  if (!isIntegrationDatabaseConfigured()) {
    throw new Error(
      'INTEGRATION_TEST=1 과 TEST_DATABASE_URL이 필요합니다. .env에 테스트 DB URL을 설정하세요.',
    );
  }

  applyIntegrationTestDatabaseEnv();

  const client = createPrismaClient({
    log: [{ level: 'error', emit: 'stdout' }],
  });
  await client.$connect();
  return client;
}

/** 통합 테스트 후 PrismaClient 연결을 해제한다 */
export async function disconnectIntegrationTestDatabase(
  client: PrismaClient,
): Promise<void> {
  await client.$disconnect();
}
