import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isE2eConfigured,
} from './prisma/integration-test-database';
import { createE2eApp } from './e2e/create-e2e-app';
import {
  cleanupE2eMember,
  E2E_DEVICE_ID,
  E2E_MEMBER_EMAIL,
  E2E_MEMBER_PASSWORD,
  seedE2eMember,
} from './e2e/e2e-member.fixture';
import type { PrismaClient } from '@prisma/client';

const describeE2e = isE2eConfigured() ? describe : describe.skip;

describeE2e('App HTTP smoke (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let e2eMemberId: number;
  let accessToken: string;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    e2eMemberId = await seedE2eMember(prisma);
    app = await createE2eApp();
  }, 120_000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (prisma && e2eMemberId) {
      await cleanupE2eMember(prisma, e2eMemberId);
      await disconnectIntegrationTestDatabase(prisma);
    }
  });

  it('GET / — 앱 기본 라우트가 응답한다', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);
    expect(res.text).toBeTruthy();
  });

  it('POST /auth/login — 승인된 회원으로 토큰을 발급한다', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: E2E_MEMBER_EMAIL,
        password: E2E_MEMBER_PASSWORD,
        deviceId: E2E_DEVICE_ID,
        deviceName: 'e2e-runner',
      })
      .expect(200);

    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    accessToken = res.body.token;
  });

  it('GET /reservation/today — Bearer 토큰으로 보호된 예약 API가 동작한다', async () => {
    expect(accessToken).toBeTruthy();

    const res = await request(app.getHttpServer())
      .get('/reservation/today')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
