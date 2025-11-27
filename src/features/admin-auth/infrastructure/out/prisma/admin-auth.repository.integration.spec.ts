import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import { AdminAuthPrismaRepository } from './admin-auth.prisma.repository';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { AdminAuthEntity } from '../../../domain/admin-auth.entity';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('AdminAuthPrismaRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: AdminAuthPrismaRepository;
  let superAdminMemberId: number;
  let subAdminMemberId: number;
  let nonAdminMemberId: number;

  const runId = Date.now();
  const superAdminEmail = `admin-auth-repo-int-super-${runId}@integration.test`;
  const subAdminEmail = `admin-auth-repo-int-sub-${runId}@integration.test`;
  const nonAdminEmail = `admin-auth-repo-int-user-${runId}@integration.test`;
  const plainPassword = 'integration-test-password';
  let hashedPassword: string;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new AdminAuthPrismaRepository(
      prisma as unknown as PrismaService,
    );

    hashedPassword = await bcrypt.hash(plainPassword, 10);

    const superAdmin = await prisma.member.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        name: '통합테스트슈퍼관리자',
        enrollmentNumber: `admin-auth-int-super-${runId}`,
        adminLevel: 'SUPER',
        clubId: null,
      },
    });
    superAdminMemberId = superAdmin.memberId;

    const subAdmin = await prisma.member.create({
      data: {
        email: subAdminEmail,
        password: hashedPassword,
        name: '통합테스트서브관리자',
        enrollmentNumber: `admin-auth-int-sub-${runId}`,
        adminLevel: 'SUB',
        clubId: null,
      },
    });
    subAdminMemberId = subAdmin.memberId;

    const nonAdmin = await prisma.member.create({
      data: {
        email: nonAdminEmail,
        password: hashedPassword,
        name: '통합테스트일반회원',
        enrollmentNumber: `admin-auth-int-user-${runId}`,
        adminLevel: null,
        clubId: null,
      },
    });
    nonAdminMemberId = nonAdmin.memberId;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.member.deleteMany({
      where: {
        memberId: {
          in: [superAdminMemberId, subAdminMemberId, nonAdminMemberId],
        },
      },
    });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('findAuthByEmail', () => {
    it('존재하는 관리자 이메일이면 AdminAuthEntity를 반환한다', async () => {
      const entity = await repository.findAuthByEmail(superAdminEmail);

      expect(entity).toBeInstanceOf(AdminAuthEntity);
      expect(entity!.memberId).toBe(superAdminMemberId);
      expect(entity!.email).toBe(superAdminEmail);
      expect(entity!.password).toBe(hashedPassword);
      expect(entity!.adminLevel).toBe('SUPER');
      expect(entity!.clubId).toBeNull();
      expect(entity!.isAdmin()).toBe(true);
    });

    it('존재하지 않는 이메일이면 null을 반환한다', async () => {
      const entity = await repository.findAuthByEmail(
        `missing-${superAdminEmail}`,
      );
      expect(entity).toBeNull();
    });
  });

  describe('findAdminByMemberId', () => {
    it('존재하는 관리자 memberId면 AdminAuthEntity를 반환한다', async () => {
      const entity = await repository.findAdminByMemberId(superAdminMemberId);

      expect(entity).toBeInstanceOf(AdminAuthEntity);
      expect(entity!.memberId).toBe(superAdminMemberId);
      expect(entity!.isAdmin()).toBe(true);
    });

    it('존재하지 않는 memberId면 null을 반환한다', async () => {
      const entity = await repository.findAdminByMemberId(
        superAdminMemberId + 99_999_999,
      );
      expect(entity).toBeNull();
    });
  });

  describe('findAdminEmails', () => {
    const runIdEmailFilter = (email: string) =>
      email.includes(`admin-auth-repo-int-`) && email.includes(`${runId}`);

    it('adminLevel이 not null인 관리자 이메일만 반환한다', async () => {
      const result = await repository.findAdminEmails();
      const scoped = result.filter((row) => runIdEmailFilter(row.email));

      expect(scoped).toHaveLength(2);
      expect(scoped.map((row) => row.email).sort()).toEqual(
        [superAdminEmail, subAdminEmail].sort(),
      );
      expect(scoped.every((row) => Object.keys(row).sort().join() === 'email')).toBe(
        true,
      );
    });

    it('일반 회원(adminLevel null) 이메일은 결과에 포함하지 않는다', async () => {
      const result = await repository.findAdminEmails();
      const emails = result.map((row) => row.email);

      expect(emails).not.toContain(nonAdminEmail);
    });
  });
});
