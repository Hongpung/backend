import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { AdminLevelLookupService } from 'src/features/admin/application/use-case/admin-level-lookup.use-case';
import { PrismaAdminRepository } from 'src/features/admin/infrastructure/out/prisma/admin.prisma.repository';
import { ReservationAdminLookupAdapter } from './reservation-admin-lookup.adapter';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('ReservationAdminLookupAdapter (통합)', () => {
  let prisma: PrismaClient;
  let adapter: ReservationAdminLookupAdapter;

  const runId = Date.now();
  let testClubId: number;
  let superAdminMemberId: number;
  let subAdminMemberId: number;
  let nonAdminMemberId: number;

  const email = (suffix: string) =>
    `res-admin-lookup-int-${runId}-${suffix}@integration.test`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    const adminLevelLookup = new AdminLevelLookupService(
      new PrismaAdminRepository(prisma as unknown as PrismaService),
    );
    adapter = new ReservationAdminLookupAdapter(adminLevelLookup);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 52_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `admin-lookup-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const superAdmin = await prisma.member.create({
      data: {
        email: email('super'),
        password: 'pw',
        name: '슈퍼관리자',
        enrollmentNumber: `admin-lookup-int-${runId}-sa`,
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
        enrollmentNumber: `admin-lookup-int-${runId}-sub`,
        clubId: testClubId,
        adminLevel: 'SUB',
      },
    });
    subAdminMemberId = subAdmin.memberId;

    const nonAdmin = await prisma.member.create({
      data: {
        email: email('user'),
        password: 'pw',
        name: '일반회원',
        enrollmentNumber: `admin-lookup-int-${runId}-u`,
        clubId: testClubId,
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
    await prisma.club.delete({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('requireAdmin', () => {
    it('SUPER·SUB 관리자는 통과한다', async () => {
      await expect(adapter.requireAdmin(superAdminMemberId)).resolves.toBeUndefined();
      await expect(adapter.requireAdmin(subAdminMemberId)).resolves.toBeUndefined();
    });

    it('관리자가 아니면 UnauthorizedException을 던진다', async () => {
      await expect(adapter.requireAdmin(nonAdminMemberId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('requireSuperAdmin', () => {
    it('SUPER 관리자는 이름을 반환한다', async () => {
      const result = await adapter.requireSuperAdmin(superAdminMemberId);

      expect(result).toEqual({ name: '슈퍼관리자' });
    });

    it('SUB 관리자는 UnauthorizedException을 던진다', async () => {
      await expect(adapter.requireSuperAdmin(subAdminMemberId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('관리자가 아니면 UnauthorizedException을 던진다', async () => {
      await expect(adapter.requireSuperAdmin(nonAdminMemberId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
