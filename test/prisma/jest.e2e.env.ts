import { config } from 'dotenv';
import { resolve } from 'path';
import { applyIntegrationTestDatabaseEnv } from './integration-test-database';

config({ path: resolve(__dirname, '../../.env') });

if (!process.env.INTEGRATION_TEST) {
  process.env.INTEGRATION_TEST = '1';
}

if (!process.env.E2E_TEST) {
  process.env.E2E_TEST = '1';
}

applyIntegrationTestDatabaseEnv();
