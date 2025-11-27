import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthCredentialService } from './admin-auth-credential.service';
import { AdminAuthPrismaRepository } from '../infrastructure/out/prisma/admin-auth.prisma.repository';
import type { AdminAuthTokenIssuerPort } from './ports/out/token-issuer.port';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('AdminAuthService (통합)', () => {
  let prisma: PrismaClient;
  let repository: AdminAuthPrismaRepository;
  let credentialService: AdminAuthCredentialService;
  let service: AdminAuthService;
  let tokenIssuer: jest.Mocked<AdminAuthTokenIssuerPort>;

  const runId = Date.now();
  const adminEmail = `admin-auth-svc-admin-${runId}@integration.test`;
  const nonAdminEmail = `admin-auth-svc-user-${runId}@integration.test`;
  const plainPassword = 'integration-service-password';

  let adminMemberId: number;
  let nonAdminMemberId: number;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new AdminAuthPrismaRepository(
      prisma as unknown as PrismaService,
    );
    credentialService = new AdminAuthCredentialService();

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const admin = await prisma.member.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: '서비스통합관리자',
        enrollmentNumber: `admin-auth-svc-admin-${runId}`,
        adminLevel: 'SUPER',
        clubId: null,
      },
    });
    adminMemberId = admin.memberId;

    const nonAdmin = await prisma.member.create({
      data: {
        email: nonAdminEmail,
        password: hashedPassword,
        name: '서비스통합일반회원',
        enrollmentNumber: `admin-auth-svc-user-${runId}`,
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

  beforeEach(() => {
    tokenIssuer = {
      issueAdminToken: jest.fn(async () => 'integration-admin-token'),
    };

    service = new AdminAuthService(
      repository,
      tokenIssuer,
      credentialService,
    );
  });

  describe('adminLogin', () => {
    it('유효한 관리자 로그인 시 토큰을 발급한다', async () => {
      const result = await service.adminLogin(adminEmail, plainPassword);

      expect(result).toEqual({ token: 'integration-admin-token' });
      expect(tokenIssuer.issueAdminToken).toHaveBeenCalledWith({
        adminId: adminMemberId,
        adminRole: 'SUPER',
        clubId: null,
      });
    });

    it('비밀번호가 일치하지 않으면 UnauthorizedException을 던진다', async () => {
      await expect(
        service.adminLogin(adminEmail, 'wrong-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(tokenIssuer.issueAdminToken).not.toHaveBeenCalled();
    });

    it('이메일에 해당하는 계정이 없으면 UnauthorizedException을 던진다', async () => {
      await expect(
        service.adminLogin(`missing-${adminEmail}`, plainPassword),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(tokenIssuer.issueAdminToken).not.toHaveBeenCalled();
    });

    it('일반 멤버(adminLevel null) 로그인 시 UnauthorizedException을 던진다', async () => {
      await expect(
        service.adminLogin(nonAdminEmail, plainPassword),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(tokenIssuer.issueAdminToken).not.toHaveBeenCalled();
    });
  });

  describe('adminExtendToken', () => {
    it('유효한 관리자 토큰 연장 시 새 토큰을 발급한다', async () => {
      const result = await service.adminExtendToken(adminMemberId);

      expect(result).toEqual({ token: 'integration-admin-token' });
      expect(tokenIssuer.issueAdminToken).toHaveBeenCalledWith({
        adminId: adminMemberId,
        adminRole: 'SUPER',
        clubId: null,
      });
    });

    it('존재하지 않는 memberId면 NotFoundException을 던진다', async () => {
      await expect(
        service.adminExtendToken(adminMemberId + 99_999_999),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(tokenIssuer.issueAdminToken).not.toHaveBeenCalled();
    });

    it('토큰 연장 대상이 비관리자면 UnauthorizedException을 던진다', async () => {
      await expect(
        service.adminExtendToken(nonAdminMemberId),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(tokenIssuer.issueAdminToken).not.toHaveBeenCalled();
    });
  });
});
