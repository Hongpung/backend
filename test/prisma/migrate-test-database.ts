import { execSync } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';
import {
  applyIntegrationTestDatabaseEnv,
  getTestDatabaseUrl,
} from './integration-test-database';

config({ path: resolve(__dirname, '../../.env') });

const testUrl = getTestDatabaseUrl();
if (!testUrl) {
  console.error(
    '[db:test:migrate] TEST_DATABASE_URL이 없습니다. .env를 확인하세요.',
  );
  process.exit(1);
}

applyIntegrationTestDatabaseEnv();

console.log('[db:test:migrate] prisma migrate deploy (TEST_DATABASE_URL)');
execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: process.env,
});
