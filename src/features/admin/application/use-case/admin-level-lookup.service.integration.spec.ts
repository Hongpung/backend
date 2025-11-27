import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { PrismaAdminRepository } from '../../infrastructure/out/prisma/admin.prisma.repository';
import { AdminLevelLookupService } from './admin-level-lookup.use-case';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('AdminLevelLookupService (통합)', () => {
  let prisma: PrismaClient;
  let service: AdminLevelLookupService;

  const runId = Date.now();
  let testClubId: number;
  let superAdminMemberId: number;
  let subAdminMemberId: number;
  let plainMemberMemberId: number;
  let missingMemberId: number;

  const email = (suffix: string) =>
    `admin-level-lookup-int-${runId}-${suffix}@integration.test`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();

    const repository = new PrismaAdminRepository(
      prisma as unknown as PrismaService,
    );
    service = new AdminLevelLookupService(repository);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 54_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `admin-level-lookup-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const superAdmin = await prisma.member.create({
      data: {
        email: email('super'),
        password: 'pw',
        name: '슈퍼관리자',
        enrollmentNumber: `admin-level-lookup-int-${runId}-sa`,
        clubId: testClubId,
        adminLevel: 'SUPER',
      },
    });
    superAdminMemberId = superAdmin.memberId;

    const subAdmin = await prisma.member.create({
      data: {
        email: email('sub'),
        password: 'pw',
        name: '부관리자',
        enrollmentNumber: `admin-level-lookup-int-${runId}-sub`,
        clubId: testClubId,
        adminLevel: 'SUB',
      },
    });
    subAdminMemberId = subAdmin.memberId;

    const plainMember = await prisma.member.create({
      data: {
        email: email('plain'),
        password: 'pw',
        name: '일반회원',
        enrollmentNumber: `admin-level-lookup-int-${runId}-plain`,
        clubId: testClubId,
      },
    });
    plainMemberMemberId = plainMember.memberId;
    missingMemberId = plainMemberMemberId + 99_999_999;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.member.deleteMany({
      where: {
        memberId: {
          in: [superAdminMemberId, subAdminMemberId, plainMemberMemberId],
        },
      },
    });
    await prisma.club.delete({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('assertIsAdmin', () => {
    it('SUPER 관리자면 통과한다', async () => {
      await expect(service.assertIsAdmin(superAdminMemberId)).resolves.toBeUndefined();
    });

    it('SUB 관리자면 통과한다', async () => {
      await expect(service.assertIsAdmin(subAdminMemberId)).resolves.toBeUndefined();
    });

    it('adminLevel이 null이면 UnauthorizedException', async () => {
      await expect(service.assertIsAdmin(plainMemberMemberId)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('회원이 없으면 UnauthorizedException', async () => {
      await expect(service.assertIsAdmin(missingMemberId)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('assertIsSuperAdmin', () => {
    it('SUPER 관리자면 name을 반환한다', async () => {
      await expect(service.assertIsSuperAdmin(superAdminMemberId)).resolves.toEqual({
        name: '슈퍼관리자',
      });
    });

    it('SUB 관리자면 UnauthorizedException', async () => {
      await expect(service.assertIsSuperAdmin(subAdminMemberId)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('adminLevel이 null이면 UnauthorizedException', async () => {
      await expect(
        service.assertIsSuperAdmin(plainMemberMemberId),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('회원이 없으면 UnauthorizedException', async () => {
      await expect(service.assertIsSuperAdmin(missingMemberId)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
