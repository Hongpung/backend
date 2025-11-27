import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { AdminEntity } from '../../../domain/admin.entity';
import { PrismaAdminRepository } from './admin.prisma.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('PrismaAdminRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: PrismaAdminRepository;

  const runId = Date.now();
  let testClubId: number;
  let superAdminMemberId: number;
  let subAdminMemberId: number;
  let plainMemberMemberId: number;
  let missingMemberId: number;

  const email = (suffix: string) =>
    `admin-repo-int-${runId}-${suffix}@integration.test`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new PrismaAdminRepository(prisma as unknown as PrismaService);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 53_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `admin-repo-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const superAdmin = await prisma.member.create({
      data: {
        email: email('super'),
        password: 'pw',
        name: '슈퍼관리자',
        enrollmentNumber: `admin-repo-int-${runId}-sa`,
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
        enrollmentNumber: `admin-repo-int-${runId}-sub`,
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
        enrollmentNumber: `admin-repo-int-${runId}-plain`,
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

  describe('findAllAdmins', () => {
    it('adminLevel이 있는 회원만 club을 포함해 반환하고 plainMember는 제외한다', async () => {
      const admins = await repository.findAllAdmins();
      const memberIds = admins.map((a) => a.memberId);

      expect(memberIds).toContain(superAdminMemberId);
      expect(memberIds).toContain(subAdminMemberId);
      expect(memberIds).not.toContain(plainMemberMemberId);

      const superAdmin = admins.find((a) => a.memberId === superAdminMemberId);
      const subAdmin = admins.find((a) => a.memberId === subAdminMemberId);

      expect(superAdmin).toBeInstanceOf(AdminEntity);
      expect(superAdmin!.isSuperAdmin()).toBe(true);
      expect(superAdmin!.club?.clubId).toBe(testClubId);
      expect(superAdmin!.club?.clubName).toBe(`admin-repo-int-club-${testClubId}`);

      expect(subAdmin).toBeInstanceOf(AdminEntity);
      expect(subAdmin!.isSubAdmin()).toBe(true);
      expect(subAdmin!.club?.clubId).toBe(testClubId);
    });
  });

  describe('findAdminLevel', () => {
    it('존재하는 memberId면 isSuperAdmin과 club이 포함된 AdminEntity를 반환한다', async () => {
      const admin = await repository.findAdminLevel(superAdminMemberId);

      expect(admin).toBeInstanceOf(AdminEntity);
      expect(admin!.memberId).toBe(superAdminMemberId);
      expect(admin!.isSuperAdmin()).toBe(true);
      expect(admin!.club?.clubId).toBe(testClubId);
      expect(admin!.club?.clubName).toBe(`admin-repo-int-club-${testClubId}`);
    });

    it('존재하지 않는 memberId면 null을 반환한다', async () => {
      expect(await repository.findAdminLevel(missingMemberId)).toBeNull();
    });
  });

  describe('findAdminByMemberId', () => {
    it('subAdmin이면 isSubAdmin과 club이 포함된 AdminEntity를 반환한다', async () => {
      const admin = await repository.findAdminByMemberId(subAdminMemberId);

      expect(admin).toBeInstanceOf(AdminEntity);
      expect(admin!.memberId).toBe(subAdminMemberId);
      expect(admin!.isSubAdmin()).toBe(true);
      expect(admin!.club?.clubId).toBe(testClubId);
      expect(admin!.club?.clubName).toBe(`admin-repo-int-club-${testClubId}`);
    });

    it('plainMember면 adminLevel은 null이고 isAdmin은 false이며 club은 매핑된다', async () => {
      const member = await repository.findAdminByMemberId(plainMemberMemberId);

      expect(member).toBeInstanceOf(AdminEntity);
      expect(member!.memberId).toBe(plainMemberMemberId);
      expect(member!.adminLevel).toBeNull();
      expect(member!.isAdmin()).toBe(false);
      expect(member!.club?.clubId).toBe(testClubId);
      expect(member!.club?.clubName).toBe(`admin-repo-int-club-${testClubId}`);
    });

    it('존재하지 않는 memberId면 null을 반환한다', async () => {
      expect(await repository.findAdminByMemberId(missingMemberId)).toBeNull();
    });
  });

  describe('createAdminLevel', () => {
    it('plainMember에 SUB를 부여하면 DB에 반영되고 deleteAdminLevel로 복원한다', async () => {
      await repository.createAdminLevel(plainMemberMemberId, 'SUB');

      const row = await prisma.member.findUnique({
        where: { memberId: plainMemberMemberId },
        select: { adminLevel: true },
      });
      expect(row?.adminLevel).toBe('SUB');

      await repository.deleteAdminLevel(plainMemberMemberId);

      const restored = await prisma.member.findUnique({
        where: { memberId: plainMemberMemberId },
        select: { adminLevel: true },
      });
      expect(restored?.adminLevel).toBeNull();
    });

    it('존재하지 않는 memberId면 NotFoundException을 던진다', async () => {
      await expect(
        repository.createAdminLevel(missingMemberId, 'SUB'),
      ).rejects.toMatchObject({
        message: '해당 유저를 찾을 수 없습니다.',
      });
      await expect(
        repository.createAdminLevel(missingMemberId, 'SUB'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateAdminLevel', () => {
    it('subAdmin의 adminLevel을 SUB→SUPER로 변경한 뒤 SUB로 복원한다', async () => {
      await repository.updateAdminLevel(subAdminMemberId, 'SUPER');

      let row = await prisma.member.findUnique({
        where: { memberId: subAdminMemberId },
        select: { adminLevel: true },
      });
      expect(row?.adminLevel).toBe('SUPER');

      await repository.updateAdminLevel(subAdminMemberId, 'SUB');

      row = await prisma.member.findUnique({
        where: { memberId: subAdminMemberId },
        select: { adminLevel: true },
      });
      expect(row?.adminLevel).toBe('SUB');
    });

    it('존재하지 않는 memberId면 NotFoundException을 던진다', async () => {
      await expect(
        repository.updateAdminLevel(missingMemberId, 'SUPER'),
      ).rejects.toMatchObject({
        message: '해당 관리자를 찾을 수 없습니다.',
      });
      await expect(
        repository.updateAdminLevel(missingMemberId, 'SUPER'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteAdminLevel', () => {
    it('plainMember에 SUB를 부여한 뒤 deleteAdminLevel하면 adminLevel이 null이 된다', async () => {
      await repository.createAdminLevel(plainMemberMemberId, 'SUB');
      await repository.deleteAdminLevel(plainMemberMemberId);

      const row = await prisma.member.findUnique({
        where: { memberId: plainMemberMemberId },
        select: { adminLevel: true },
      });
      expect(row?.adminLevel).toBeNull();
    });

    it('존재하지 않는 memberId면 NotFoundException을 던진다', async () => {
      await expect(
        repository.deleteAdminLevel(missingMemberId),
      ).rejects.toMatchObject({
        message: '해당 관리자를 찾을 수 없습니다.',
      });
      await expect(
        repository.deleteAdminLevel(missingMemberId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
