import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { PrismaAdminRepository } from '../infrastructure/out/prisma/admin.prisma.repository';
import { AdminService } from './admin.service';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

/** Nest HttpException은 response에 { message } 객체 형태로 실린다. 호출은 한 번만 한다. */
async function expectRejectMessage(
  promise: Promise<unknown>,
  ExceptionClass: abstract new (...args: unknown[]) => {
    getResponse(): unknown;
  },
  message: string,
) {
  const err = await promise.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ExceptionClass);
  expect(
    (err as InstanceType<typeof ExceptionClass>).getResponse(),
  ).toMatchObject({ message });
}

describeIntegration('AdminService (통합)', () => {
  let prisma: PrismaClient;
  let service: AdminService;

  const runId = Date.now();
  let testClubId: number;
  let superAdminMemberId: number;
  let subAdminMemberId: number;
  let plainMemberMemberId: number;
  let createSubCandidateId: number;
  let createSuperCandidateId: number;
  let deleteCandidateSubId: number;
  let missingMemberId: number;

  const email = (suffix: string) =>
    `admin-svc-int-${runId}-${suffix}@integration.test`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();

    const repository = new PrismaAdminRepository(
      prisma as unknown as PrismaService,
    );
    service = new AdminService(repository);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    testClubId = (maxClub._max.clubId ?? 0) + 55_000;

    await prisma.club.create({
      data: {
        clubId: testClubId,
        clubName: `admin-svc-int-club-${testClubId}`,
        profileImageUrl: null,
      },
    });

    const superAdmin = await prisma.member.create({
      data: {
        email: email('super'),
        password: 'pw',
        name: '슈퍼관리자',
        enrollmentNumber: `admin-svc-int-${runId}-sa`,
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
        enrollmentNumber: `admin-svc-int-${runId}-sub`,
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
        enrollmentNumber: `admin-svc-int-${runId}-plain`,
        clubId: testClubId,
      },
    });
    plainMemberMemberId = plainMember.memberId;

    const createSubCandidate = await prisma.member.create({
      data: {
        email: email('create-sub'),
        password: 'pw',
        name: 'SUB부여대상',
        enrollmentNumber: `admin-svc-int-${runId}-create-sub`,
        clubId: testClubId,
      },
    });
    createSubCandidateId = createSubCandidate.memberId;

    const createSuperCandidate = await prisma.member.create({
      data: {
        email: email('create-super'),
        password: 'pw',
        name: 'SUPER부여대상',
        enrollmentNumber: `admin-svc-int-${runId}-create-super`,
        clubId: testClubId,
      },
    });
    createSuperCandidateId = createSuperCandidate.memberId;

    const deleteCandidate = await prisma.member.create({
      data: {
        email: email('delete-sub'),
        password: 'pw',
        name: '삭제대상부관리자',
        enrollmentNumber: `admin-svc-int-${runId}-delete-sub`,
        clubId: testClubId,
        adminLevel: 'SUB',
      },
    });
    deleteCandidateSubId = deleteCandidate.memberId;

    missingMemberId = plainMemberMemberId + 99_999_999;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.member.deleteMany({
      where: {
        memberId: {
          in: [
            superAdminMemberId,
            subAdminMemberId,
            plainMemberMemberId,
            createSubCandidateId,
            createSuperCandidateId,
            deleteCandidateSubId,
          ],
        },
      },
    });
    await prisma.club.delete({ where: { clubId: testClubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('createAdmin', () => {
    it('본인에게 권한을 부여하면 BadRequestException', async () => {
      await expectRejectMessage(
        service.createAdmin(superAdminMemberId, superAdminMemberId, 'SUPER'),
        BadRequestException,
        '본인에게 권한을 부여할 수 없습니다.',
      );
    });

    it('요청자가 SUPER가 아니면(SUB) UnauthorizedException', async () => {
      await expect(
        service.createAdmin(subAdminMemberId, createSubCandidateId, 'SUB'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('대상 회원이 없으면 BadRequestException', async () => {
      await expectRejectMessage(
        service.createAdmin(superAdminMemberId, missingMemberId, 'SUB'),
        BadRequestException,
        '해당 유저를 찾을 수 없습니다.',
      );
    });

    it('대상이 이미 관리자이면 BadRequestException', async () => {
      await expectRejectMessage(
        service.createAdmin(superAdminMemberId, subAdminMemberId, 'SUPER'),
        BadRequestException,
        '해당 유저는 이미 관리자입니다.',
      );
    });

    it('정상 시 SUB를 부여하면 DB에 반영되고 메시지와 관리자를 반환한다', async () => {
      const result = await service.createAdmin(
        superAdminMemberId,
        createSubCandidateId,
        'SUB',
      );

      expect(result.message).toBe('관리자 권한이 성공적으로 부여되었습니다.');
      expect(result.admin.memberId).toBe(createSubCandidateId);
      expect(result.admin.isSubAdmin()).toBe(true);

      const row = await prisma.member.findUnique({
        where: { memberId: createSubCandidateId },
        select: { adminLevel: true },
      });
      expect(row?.adminLevel).toBe('SUB');
    });

    it('정상 시 SUPER를 부여하면 DB에 반영되고 메시지와 관리자를 반환한다', async () => {
      const result = await service.createAdmin(
        superAdminMemberId,
        createSuperCandidateId,
        'SUPER',
      );

      expect(result.message).toBe('관리자 권한이 성공적으로 부여되었습니다.');
      expect(result.admin.memberId).toBe(createSuperCandidateId);
      expect(result.admin.isSuperAdmin()).toBe(true);

      const row = await prisma.member.findUnique({
        where: { memberId: createSuperCandidateId },
        select: { adminLevel: true },
      });
      expect(row?.adminLevel).toBe('SUPER');
    });
  });

  describe('changeAdminLevel', () => {
    it('본인 권한을 바꾸려 하면 BadRequestException', async () => {
      await expectRejectMessage(
        service.changeAdminLevel(superAdminMemberId, superAdminMemberId, 'SUB'),
        BadRequestException,
        '본인의 권한은 수정할 수 없습니다.',
      );
    });

    it('요청자가 SUPER가 아니면(SUB) UnauthorizedException', async () => {
      await expect(
        service.changeAdminLevel(subAdminMemberId, plainMemberMemberId, 'SUB'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('정상 시 adminLevel을 변경하고 DB에 반영한 뒤 원래 레벨로 복원한다', async () => {
      const result = await service.changeAdminLevel(
        superAdminMemberId,
        subAdminMemberId,
        'SUPER',
      );

      expect(result.message).toBe('관리자 권한이 성공적으로 변경되었습니다.');
      expect(result.admin.memberId).toBe(subAdminMemberId);
      expect(result.admin.isSuperAdmin()).toBe(true);

      let row = await prisma.member.findUnique({
        where: { memberId: subAdminMemberId },
        select: { adminLevel: true },
      });
      expect(row?.adminLevel).toBe('SUPER');

      await service.changeAdminLevel(
        superAdminMemberId,
        subAdminMemberId,
        'SUB',
      );

      row = await prisma.member.findUnique({
        where: { memberId: subAdminMemberId },
        select: { adminLevel: true },
      });
      expect(row?.adminLevel).toBe('SUB');
    });
  });

  describe('deleteAdminLevel', () => {
    it('본인 권한을 삭제하려 하면 BadRequestException', async () => {
      await expectRejectMessage(
        service.deleteAdminLevel(superAdminMemberId, superAdminMemberId),
        BadRequestException,
        '본인의 권한은 수정할 수 없습니다.',
      );
    });

    it('요청자가 SUPER가 아니면(SUB) UnauthorizedException', async () => {
      await expect(
        service.deleteAdminLevel(subAdminMemberId, deleteCandidateSubId),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('대상 관리자가 없으면 UnauthorizedException', async () => {
      await expectRejectMessage(
        service.deleteAdminLevel(superAdminMemberId, missingMemberId),
        UnauthorizedException,
        '관리자를 찾을 수 없습니다.',
      );
    });

    it('정상 시 adminLevel을 null로 만들고 메시지와 삭제 전 스냅샷을 반환한다', async () => {
      const result = await service.deleteAdminLevel(
        superAdminMemberId,
        deleteCandidateSubId,
      );

      expect(result.message).toBe('관리자 권한이 성공적으로 삭제되었습니다.');
      expect(result.admin.memberId).toBe(deleteCandidateSubId);
      expect(result.admin.isSubAdmin()).toBe(true);

      const row = await prisma.member.findUnique({
        where: { memberId: deleteCandidateSubId },
        select: { adminLevel: true },
      });
      expect(row?.adminLevel).toBeNull();
    });
  });
});
