import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient, type Prisma } from '@prisma/client';
import type { PoolConfig } from 'mariadb';

/** Node EventEmitter default(10) 초과 시 pool 관련 경고 완화 */
const DEFAULT_POOL_CONNECTION_LIMIT = 10;

export const prismaQueryLog: Prisma.LogDefinition[] = [
  { level: 'query', emit: 'event' },
  { level: 'warn', emit: 'stdout' },
  { level: 'error', emit: 'stdout' },
];

export function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  }
  return url;
}

function parseMysqlDatabaseUrl(databaseUrl: string): PoolConfig {
  const parsed = new URL(databaseUrl.replace(/^mysql:\/\//, 'http://'));
  const connectionLimitParam = parsed.searchParams.get('connection_limit');
  const connectionLimit = connectionLimitParam
    ? Number(connectionLimitParam)
    : DEFAULT_POOL_CONNECTION_LIMIT;

  const database = parsed.pathname.replace(/^\//, '');
  const allowPublicKeyRetrieval =
    parsed.searchParams.get('allowPublicKeyRetrieval') !== 'false';

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: database || undefined,
    connectionLimit,
    allowPublicKeyRetrieval,
  };
}

export function createMariaDbAdapter(databaseUrl: string): PrismaMariaDb {
  return new PrismaMariaDb(parseMysqlDatabaseUrl(databaseUrl));
}

export type CreatePrismaClientOptions = {
  databaseUrl?: string;
  log?: Prisma.LogDefinition[];
};

export function createPrismaClient(
  options: CreatePrismaClientOptions = {},
): PrismaClient {
  const databaseUrl = options.databaseUrl ?? resolveDatabaseUrl();
  const adapter = createMariaDbAdapter(databaseUrl);

  return new PrismaClient({
    adapter,
    log: options.log ?? prismaQueryLog,
  });
}
