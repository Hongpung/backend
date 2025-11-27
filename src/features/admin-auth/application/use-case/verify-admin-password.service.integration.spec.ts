import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { VerifyAdminPasswordService } from './verify-admin-password.use-case';
import { AdminAuthCredentialService } from '../admin-auth-credential.service';
import { AdminAuthPrismaRepository } from '../../infrastructure/out/prisma/admin-auth.prisma.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('VerifyAdminPasswordService (통합)', () => {
  let prisma: PrismaClient;
  let repository: AdminAuthPrismaRepository;
  let credentialService: AdminAuthCredentialService;
  let service: VerifyAdminPasswordService;

  const runId = Date.now();
  const adminEmail = `verify-admin-pwd-admin-${runId}@integration.test`;
  const nonAdminEmail = `verify-admin-pwd-user-${runId}@integration.test`;
  const plainPassword = 'verify-admin-password-integration';

  let adminMemberId: number;
  let nonAdminMemberId: number;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new AdminAuthPrismaRepository(
      prisma as unknown as PrismaService,
    );
    credentialService = new AdminAuthCredentialService();
    service = new VerifyAdminPasswordService(repository, credentialService);

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const admin = await prisma.member.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: '비밀번호검증통합관리자',
        enrollmentNumber: `verify-admin-pwd-admin-${runId}`,
        adminLevel: 'SUPER',
        clubId: null,
      },
    });
    adminMemberId = admin.memberId;

    const nonAdmin = await prisma.member.create({
      data: {
        email: nonAdminEmail,
        password: hashedPassword,
        name: '비밀번호검증통합일반회원',
        enrollmentNumber: `verify-admin-pwd-user-${runId}`,
        adminLevel: null,
        clubId: null,
      },
    });
    nonAdminMemberId = nonAdmin.memberId;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.member.deleteMany({
      where: { memberId: { in: [adminMemberId, nonAdminMemberId] } },
    });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('verify', () => {
    it('SUPER 관리자와 올바른 비밀번호면 true를 반환한다', async () => {
      const result = await service.verify({
        adminId: adminMemberId,
        password_for_verification: plainPassword,
      });

      expect(result).toBe(true);
    });

    it('SUPER 관리자와 잘못된 비밀번호면 false를 반환한다', async () => {
      const result = await service.verify({
        adminId: adminMemberId,
        password_for_verification: 'wrong-password',
      });

      expect(result).toBe(false);
    });

    it('존재하지 않는 adminId면 false를 반환한다', async () => {
      const result = await service.verify({
        adminId: adminMemberId + 99_999_999,
        password_for_verification: plainPassword,
      });

      expect(result).toBe(false);
    });

    it('adminLevel이 null인 memberId면 false를 반환한다', async () => {
      const result = await service.verify({
        adminId: nonAdminMemberId,
        password_for_verification: plainPassword,
      });

      expect(result).toBe(false);
    });
  });
});
