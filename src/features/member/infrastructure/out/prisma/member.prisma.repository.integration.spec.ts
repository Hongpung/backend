import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../../../test/prisma/integration-test-database';
import { MemberPrismaRepository } from './member.prisma.repository';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { MemberEntity } from '../../../domain/member.entity';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('MemberPrismaRepository (통합)', () => {
  let prisma: PrismaClient;
  let repository: MemberPrismaRepository;

  const runId = Date.now();
  let clubAId: number;
  let clubBId: number;
  let memberId: number;

  const email = `member-repo-int-${runId}@integration.test`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();
    repository = new MemberPrismaRepository(prisma as unknown as PrismaService);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    clubAId = (maxClub._max.clubId ?? 0) + 46_000;
    clubBId = clubAId + 1;

    await prisma.club.createMany({
      data: [
        {
          clubId: clubAId,
          clubName: `member-int-club-a-${clubAId}`,
          profileImageUrl: null,
        },
        {
          clubId: clubBId,
          clubName: `member-int-club-b-${clubBId}`,
          profileImageUrl: null,
        },
      ],
    });

    const member = await prisma.member.create({
      data: {
        email,
        password: 'pw',
        name: '통합멤버',
        nickname: '닉네임',
        enrollmentNumber: `member-int-${runId}`,
        clubId: clubAId,
        isPermmited: 'ACCEPTED',
      },
    });
    memberId = member.memberId;

    await prisma.roleAssignment.create({
      data: {
        clubId: clubAId,
        memberId,
        role: 'LEADER',
      },
    });
    await prisma.clubPrimaryMember.create({
      data: { clubId: clubAId, memberId },
    });
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.clubPrimaryMember.deleteMany({
      where: { memberId },
    });
    await prisma.roleAssignment.deleteMany({ where: { memberId } });
    await prisma.member.deleteMany({ where: { memberId } });
    await prisma.club.deleteMany({
      where: { clubId: { in: [clubAId, clubBId] } },
    });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('findMemberByMemberId', () => {
    it('club·roleAssignment을 포함한 MemberEntity를 반환한다', async () => {
      const entity = await repository.findMemberByMemberId(memberId);

      expect(entity).toBeInstanceOf(MemberEntity);
      expect(entity!.memberId).toBe(memberId);
      expect(entity!.clubId).toBe(clubAId);
      expect(entity!.club?.clubName).toBe(`member-int-club-a-${clubAId}`);
      expect(entity!.getRolesAsKorean()).toContain('패짱');
    });

    it('존재하지 않는 memberId면 null을 반환한다', async () => {
      expect(await repository.findMemberByMemberId(memberId + 99_999)).toBeNull();
    });
  });

  describe('findMembersByIds', () => {
    it('빈 배열 입력이면 빈 배열을 반환한다', async () => {
      const result = await repository.findMembersByIds([]);
      expect(result).toEqual([]);
    });

    it('여러 memberId로 MemberEntity 배열을 반환한다', async () => {
      const otherEmail = `member-repo-ids-${runId}@integration.test`;
      const other = await prisma.member.create({
        data: {
          email: otherEmail,
          password: 'pw',
          name: '두번째멤버',
          enrollmentNumber: `member-int-ids-${runId}`,
          clubId: clubBId,
          isPermmited: 'ACCEPTED',
        },
      });

      try {
        const result = await repository.findMembersByIds([memberId, other.memberId]);
        expect(result).toHaveLength(2);
        const ids = result.map((m) => m.memberId).sort((a, b) => a - b);
        expect(ids).toEqual([memberId, other.memberId].sort((a, b) => a - b));
      } finally {
        await prisma.member.delete({ where: { memberId: other.memberId } });
      }
    });

    it('club·roleAssignment을 포함한 MemberEntity를 반환한다', async () => {
      const result = await repository.findMembersByIds([memberId]);
      const entity = result[0];

      expect(entity).toBeInstanceOf(MemberEntity);
      expect(entity!.memberId).toBe(memberId);
      expect(entity!.clubId).toBe(clubAId);
      expect(entity!.club?.clubName).toBe(`member-int-club-a-${clubAId}`);
      expect(entity!.getRolesAsKorean()).toContain('패짱');
    });

    it('존재하는 ID와 없는 ID를 함께 전달하면 존재하는 멤버만 반환한다', async () => {
      const result = await repository.findMembersByIds([memberId, memberId + 99_999]);
      expect(result).toHaveLength(1);
      expect(result[0]!.memberId).toBe(memberId);
    });
  });

  describe('findMembersByCondition', () => {
    it('clubId·isPermitted·role 조건으로 필터링한다', async () => {
      const members = await repository.findMembersByCondition({
        clubId: clubAId,
        isPermitted: 'ACCEPTED',
        role: '패짱',
      });

      expect(members.some((m) => m.memberId === memberId)).toBe(true);
    });

    it('조건에 맞지 않으면 빈 배열을 반환한다', async () => {
      const members = await repository.findMembersByCondition({
        clubId: clubBId,
      });
      expect(members).toHaveLength(0);
    });
  });

  describe('existsMember', () => {
    it('존재하는 memberId면 true를 반환한다', async () => {
      expect(await repository.existsMember(memberId)).toBe(true);
    });

    it('존재하지 않는 memberId면 false를 반환한다', async () => {
      expect(await repository.existsMember(memberId + 99_999)).toBe(false);
    });
  });

  describe('updateMemberProfile', () => {
    it('닉네임 등 프로필 필드를 갱신한다', async () => {
      const updated = await repository.updateMemberProfile(memberId, {
        nickname: '변경닉네임',
      });

      expect(updated.nickname).toBe('변경닉네임');

      const row = await prisma.member.findUnique({
        where: { memberId },
        select: { nickname: true },
      });
      expect(row?.nickname).toBe('변경닉네임');
    });

    it('clubId 변경 시 roleAssignment·clubPrimaryMember를 삭제한다', async () => {
      await repository.updateMemberProfile(memberId, {
        clubId: clubBId,
      });

      const roles = await prisma.roleAssignment.findMany({
        where: { memberId },
      });
      const primary = await prisma.clubPrimaryMember.findMany({
        where: { memberId },
      });
      expect(roles).toHaveLength(0);
      expect(primary).toHaveLength(0);

      const member = await prisma.member.findUnique({
        where: { memberId },
        select: { clubId: true },
      });
      expect(member?.clubId).toBe(clubBId);

      await repository.updateMemberProfile(memberId, { clubId: clubAId });
    });

    it('존재하지 않는 clubId면 NotFoundException을 던진다', async () => {
      await expect(
        repository.updateMemberProfile(memberId, {
          clubId: clubBId + 99_999,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('중복 이메일이면 ConflictException을 던진다', async () => {
      const otherEmail = `member-repo-dup-${runId}@integration.test`;
      const other = await prisma.member.create({
        data: {
          email: otherEmail,
          password: 'pw',
          name: '다른회원',
          enrollmentNumber: `member-int-dup-${runId}`,
          isPermmited: 'ACCEPTED',
        },
      });

      try {
        await expect(
          repository.updateMemberProfile(memberId, { email: otherEmail }),
        ).rejects.toBeInstanceOf(ConflictException);
      } finally {
        await prisma.member.delete({ where: { memberId: other.memberId } });
      }
    });
  });

  describe('updateMembersPermission', () => {
    it('승인 상태를 일괄 갱신한다', async () => {
      await repository.updateMembersPermission([memberId], 'DENIED');

      const row = await prisma.member.findUnique({
        where: { memberId },
        select: { isPermmited: true },
      });
      expect(row?.isPermmited).toBe('DENIED');

      await repository.updateMembersPermission([memberId], 'ACCEPTED');
    });
  });

  describe('countMembersByCondition', () => {
    const paginationRunId = `${runId}-pag`;
    let paginationClubId: number;
    const paginationMemberIds: number[] = [];

    beforeAll(async () => {
      const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
      paginationClubId = (maxClub._max.clubId ?? 0) + 49_000;

      await prisma.club.create({
        data: {
          clubId: paginationClubId,
          clubName: `member-int-pag-club-${paginationRunId}`,
          profileImageUrl: null,
        },
      });

      for (const suffix of ['01', '02', '03'] as const) {
        const created = await prisma.member.create({
          data: {
            email: `member-pag-${paginationRunId}-${suffix}@integration.test`,
            password: 'pw',
            name: `페이지멤버${suffix}`,
            enrollmentNumber: `member-pag-${paginationRunId}-${suffix}`,
            clubId: paginationClubId,
            isPermmited: 'ACCEPTED',
          },
        });
        paginationMemberIds.push(created.memberId);
      }
    });

    afterAll(async () => {
      await prisma.member.deleteMany({
        where: { memberId: { in: paginationMemberIds } },
      });
      await prisma.club.delete({ where: { clubId: paginationClubId } });
    });

    it('clubId 조건에 맞는 회원 수를 반환한다', async () => {
      const count = await repository.countMembersByCondition({
        clubId: paginationClubId,
      });
      expect(count).toBe(3);
    });

    it('조건에 맞지 않으면 0을 반환한다', async () => {
      const count = await repository.countMembersByCondition({
        clubId: paginationClubId + 99_999,
      });
      expect(count).toBe(0);
    });
  });

  describe('findMembersByConditionPaginated', () => {
    const paginationRunId = `${runId}-page`;
    let paginationClubId: number;
    const paginationMemberIds: number[] = [];

    beforeAll(async () => {
      const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
      paginationClubId = (maxClub._max.clubId ?? 0) + 50_000;

      await prisma.club.create({
        data: {
          clubId: paginationClubId,
          clubName: `member-int-page-club-${paginationRunId}`,
          profileImageUrl: null,
        },
      });

      for (const suffix of ['01', '02', '03'] as const) {
        const created = await prisma.member.create({
          data: {
            email: `member-page-${paginationRunId}-${suffix}@integration.test`,
            password: 'pw',
            name: `페이지멤버${suffix}`,
            enrollmentNumber: `member-page-${paginationRunId}-${suffix}`,
            clubId: paginationClubId,
            isPermmited: 'ACCEPTED',
          },
        });
        paginationMemberIds.push(created.memberId);
      }
    });

    afterAll(async () => {
      await prisma.member.deleteMany({
        where: { memberId: { in: paginationMemberIds } },
      });
      await prisma.club.delete({ where: { clubId: paginationClubId } });
    });

    it('skip·take로 페이지 단위 결과를 반환한다', async () => {
      const page = await repository.findMembersByConditionPaginated(
        { clubId: paginationClubId },
        1,
        2,
      );

      expect(page).toHaveLength(2);
      const enrollments = page.map((m) => m.enrollmentNumber).sort();
      expect(enrollments).toEqual([
        `member-page-${paginationRunId}-02`,
        `member-page-${paginationRunId}-03`,
      ]);
    });

    it('orderBy 미지정 시 enrollmentNumber 오름차순이 기본이다', async () => {
      const members = await repository.findMembersByConditionPaginated(
        { clubId: paginationClubId },
        0,
        10,
      );

      expect(members.map((m) => m.enrollmentNumber)).toEqual([
        `member-page-${paginationRunId}-01`,
        `member-page-${paginationRunId}-02`,
        `member-page-${paginationRunId}-03`,
      ]);
    });

    it('orderBy desc를 지정하면 내림차순으로 반환한다', async () => {
      const members = await repository.findMembersByConditionPaginated(
        { clubId: paginationClubId },
        0,
        10,
        { enrollmentNumber: 'desc' },
      );

      expect(members.map((m) => m.enrollmentNumber)).toEqual([
        `member-page-${paginationRunId}-03`,
        `member-page-${paginationRunId}-02`,
        `member-page-${paginationRunId}-01`,
      ]);
    });

    it('조건에 맞는 회원이 없으면 빈 배열을 반환한다', async () => {
      const members = await repository.findMembersByConditionPaginated(
        { clubId: paginationClubId + 99_999 },
        0,
        10,
      );
      expect(members).toEqual([]);
    });
  });

  describe('findRoleAssignmentIdByRoleAndClub', () => {
    const roleRunId = `${runId}-role-find`;
    let roleClubId: number;
    let roleMemberId: number;

    beforeAll(async () => {
      const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
      roleClubId = (maxClub._max.clubId ?? 0) + 51_000;

      await prisma.club.create({
        data: {
          clubId: roleClubId,
          clubName: `member-int-role-find-${roleRunId}`,
          profileImageUrl: null,
        },
      });

      const member = await prisma.member.create({
        data: {
          email: `member-role-find-${roleRunId}@integration.test`,
          password: 'pw',
          name: '역할조회',
          enrollmentNumber: `member-role-find-${roleRunId}`,
          clubId: roleClubId,
          isPermmited: 'ACCEPTED',
        },
      });
      roleMemberId = member.memberId;

      await prisma.roleAssignment.create({
        data: { clubId: roleClubId, memberId: roleMemberId, role: 'SANGSOE' },
      });
    });

    afterAll(async () => {
      await prisma.roleAssignment.deleteMany({ where: { clubId: roleClubId } });
      await prisma.member.delete({ where: { memberId: roleMemberId } });
      await prisma.club.delete({ where: { clubId: roleClubId } });
    });

    it('club·role에 해당하는 roleAssignmentId를 반환한다', async () => {
      const id = await repository.findRoleAssignmentIdByRoleAndClub(
        'SANGSOE',
        roleClubId,
      );
      expect(id).not.toBeNull();

      const row = await prisma.roleAssignment.findUnique({
        where: { roleAssignmentId: id! },
      });
      expect(row?.memberId).toBe(roleMemberId);
    });

    it('해당 역할이 없으면 null을 반환한다', async () => {
      expect(
        await repository.findRoleAssignmentIdByRoleAndClub('SUBUK', roleClubId),
      ).toBeNull();
    });
  });

  describe('deleteRoleAssignments', () => {
    const roleRunId = `${runId}-role-del`;
    let roleClubId: number;
    let roleMemberId: number;

    beforeAll(async () => {
      const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
      roleClubId = (maxClub._max.clubId ?? 0) + 52_000;

      await prisma.club.create({
        data: {
          clubId: roleClubId,
          clubName: `member-int-role-del-${roleRunId}`,
          profileImageUrl: null,
        },
      });

      const member = await prisma.member.create({
        data: {
          email: `member-role-del-${roleRunId}@integration.test`,
          password: 'pw',
          name: '역할삭제',
          enrollmentNumber: `member-role-del-${roleRunId}`,
          clubId: roleClubId,
          isPermmited: 'ACCEPTED',
        },
      });
      roleMemberId = member.memberId;

      await prisma.roleAssignment.createMany({
        data: [
          { clubId: roleClubId, memberId: roleMemberId, role: 'LEADER' },
          { clubId: roleClubId, memberId: roleMemberId, role: 'SUBUK' },
        ],
      });
    });

    afterAll(async () => {
      await prisma.roleAssignment.deleteMany({ where: { clubId: roleClubId } });
      await prisma.member.delete({ where: { memberId: roleMemberId } });
      await prisma.club.delete({ where: { clubId: roleClubId } });
    });

    it('memberId·clubId에 해당하는 역할 배정을 모두 삭제한다', async () => {
      await repository.deleteRoleAssignments(roleMemberId, roleClubId);

      const remaining = await prisma.roleAssignment.findMany({
        where: { memberId: roleMemberId, clubId: roleClubId },
      });
      expect(remaining).toHaveLength(0);
    });
  });

  describe('createRoleAssignment', () => {
    const roleRunId = `${runId}-role-create`;
    let roleClubId: number;
    let roleMemberId: number;
    let otherMemberId: number;

    beforeAll(async () => {
      const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
      roleClubId = (maxClub._max.clubId ?? 0) + 53_000;

      await prisma.club.create({
        data: {
          clubId: roleClubId,
          clubName: `member-int-role-create-${roleRunId}`,
          profileImageUrl: null,
        },
      });

      const member = await prisma.member.create({
        data: {
          email: `member-role-create-${roleRunId}@integration.test`,
          password: 'pw',
          name: '역할생성',
          enrollmentNumber: `member-role-create-${roleRunId}`,
          clubId: roleClubId,
          isPermmited: 'ACCEPTED',
        },
      });
      roleMemberId = member.memberId;

      const other = await prisma.member.create({
        data: {
          email: `member-role-create-other-${roleRunId}@integration.test`,
          password: 'pw',
          name: '역할생성다른',
          enrollmentNumber: `member-role-create-other-${roleRunId}`,
          clubId: roleClubId,
          isPermmited: 'ACCEPTED',
        },
      });
      otherMemberId = other.memberId;
    });

    afterAll(async () => {
      await prisma.roleAssignment.deleteMany({ where: { clubId: roleClubId } });
      await prisma.member.deleteMany({
        where: { memberId: { in: [roleMemberId, otherMemberId] } },
      });
      await prisma.club.delete({ where: { clubId: roleClubId } });
    });

    it('새 역할 배정 row를 생성한다', async () => {
      await repository.createRoleAssignment({
        clubId: roleClubId,
        memberId: roleMemberId,
        role: 'SANGJANGGU',
      });

      const row = await prisma.roleAssignment.findFirst({
        where: {
          clubId: roleClubId,
          memberId: roleMemberId,
          role: 'SANGJANGGU',
        },
      });
      expect(row).not.toBeNull();
    });

    it('동일 club·role이 이미 있으면 unique 제약으로 실패한다', async () => {
      await repository.createRoleAssignment({
        clubId: roleClubId,
        memberId: roleMemberId,
        role: 'SUBUGGU',
      });

      await expect(
        repository.createRoleAssignment({
          clubId: roleClubId,
          memberId: otherMemberId,
          role: 'SUBUGGU',
        }),
      ).rejects.toThrow();
    });
  });

  describe('updateRoleAssignment', () => {
    const roleRunId = `${runId}-role-update`;
    let roleClubId: number;
    let fromMemberId: number;
    let toMemberId: number;
    let roleAssignmentId: number;

    beforeAll(async () => {
      const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
      roleClubId = (maxClub._max.clubId ?? 0) + 54_000;

      await prisma.club.create({
        data: {
          clubId: roleClubId,
          clubName: `member-int-role-update-${roleRunId}`,
          profileImageUrl: null,
        },
      });

      const fromMember = await prisma.member.create({
        data: {
          email: `member-role-from-${roleRunId}@integration.test`,
          password: 'pw',
          name: '이전보유자',
          enrollmentNumber: `member-role-from-${roleRunId}`,
          clubId: roleClubId,
          isPermmited: 'ACCEPTED',
        },
      });
      fromMemberId = fromMember.memberId;

      const toMember = await prisma.member.create({
        data: {
          email: `member-role-to-${roleRunId}@integration.test`,
          password: 'pw',
          name: '새보유자',
          enrollmentNumber: `member-role-to-${roleRunId}`,
          clubId: roleClubId,
          isPermmited: 'ACCEPTED',
        },
      });
      toMemberId = toMember.memberId;

      const assignment = await prisma.roleAssignment.create({
        data: { clubId: roleClubId, memberId: fromMemberId, role: 'LEADER' },
      });
      roleAssignmentId = assignment.roleAssignmentId;
    });

    afterAll(async () => {
      await prisma.roleAssignment.deleteMany({ where: { clubId: roleClubId } });
      await prisma.member.deleteMany({
        where: { memberId: { in: [fromMemberId, toMemberId] } },
      });
      await prisma.club.delete({ where: { clubId: roleClubId } });
    });

    it('roleAssignmentId row의 memberId를 새 회원으로 이전한다', async () => {
      await repository.updateRoleAssignment(roleAssignmentId, toMemberId);

      const row = await prisma.roleAssignment.findUnique({
        where: { roleAssignmentId },
      });
      expect(row?.memberId).toBe(toMemberId);

      const fromRoles = await prisma.roleAssignment.findMany({
        where: { memberId: fromMemberId, clubId: roleClubId },
      });
      expect(fromRoles).toHaveLength(0);
    });
  });

  describe('transaction', () => {
    const txRunId = `${runId}-tx`;
    let txClubId: number;
    let txMemberId: number;

    beforeAll(async () => {
      const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
      txClubId = (maxClub._max.clubId ?? 0) + 55_000;

      await prisma.club.create({
        data: {
          clubId: txClubId,
          clubName: `member-int-tx-${txRunId}`,
          profileImageUrl: null,
        },
      });

      const member = await prisma.member.create({
        data: {
          email: `member-tx-${txRunId}@integration.test`,
          password: 'pw',
          name: '트랜잭션회원',
          enrollmentNumber: `member-tx-${txRunId}`,
          clubId: txClubId,
          isPermmited: 'ACCEPTED',
        },
      });
      txMemberId = member.memberId;
    });

    afterAll(async () => {
      await prisma.roleAssignment.deleteMany({ where: { clubId: txClubId } });
      await prisma.member.delete({ where: { memberId: txMemberId } });
      await prisma.club.delete({ where: { clubId: txClubId } });
    });

    it('트랜잭션 커밋 시 역할 배정이 DB에 남는다', async () => {
      await repository.transaction(async (tx) => {
        await repository.createRoleAssignment(
          { clubId: txClubId, memberId: txMemberId, role: 'SUBUK' },
          tx,
        );
      });

      const row = await prisma.roleAssignment.findFirst({
        where: { clubId: txClubId, memberId: txMemberId, role: 'SUBUK' },
      });
      expect(row).not.toBeNull();
    });

    it('트랜잭션 롤백 시 역할 배정이 DB에 남지 않는다', async () => {
      await prisma.roleAssignment.deleteMany({
        where: { clubId: txClubId, memberId: txMemberId },
      });

      await expect(
        repository.transaction(async (tx) => {
          await repository.createRoleAssignment(
            { clubId: txClubId, memberId: txMemberId, role: 'SUBUGGU' },
            tx,
          );
          await repository.createRoleAssignment(
            { clubId: txClubId, memberId: txMemberId, role: 'SUBUGGU' },
            tx,
          );
        }),
      ).rejects.toThrow();

      const rows = await prisma.roleAssignment.findMany({
        where: { clubId: txClubId, memberId: txMemberId, role: 'SUBUGGU' },
      });
      expect(rows).toHaveLength(0);
    });
  });
});
