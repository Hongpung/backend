import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { IMemberRepository } from './ports/out/member.repository.port';
import { MemberRoleService } from './member-role.service';
import { MemberPrismaRepository } from '../infrastructure/out/prisma/member.prisma.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('MemberRoleService (통합)', () => {
  let prisma: PrismaClient;
  let service: MemberRoleService;

  const runId = Date.now();
  let clubId: number;
  let holderMemberId: number;
  let targetMemberId: number;
  let memberWithSubukId: number;
  let noClubMemberId: number;

  const holderEmail = `member-role-holder-${runId}@integration.test`;
  const targetEmail = `member-role-target-${runId}@integration.test`;
  const subukEmail = `member-role-subuk-${runId}@integration.test`;
  const noClubEmail = `member-role-noclub-${runId}@integration.test`;

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();

    const repository = new MemberPrismaRepository(
      prisma as unknown as PrismaService,
    );
    service = new MemberRoleService(repository as unknown as IMemberRepository);

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    clubId = (maxClub._max.clubId ?? 0) + 48_000;

    await prisma.club.create({
      data: {
        clubId,
        clubName: `member-role-club-${runId}`,
        profileImageUrl: null,
      },
    });

    const holder = await prisma.member.create({
      data: {
        email: holderEmail,
        password: 'pw',
        name: '패짱보유자',
        enrollmentNumber: `member-role-holder-${runId}`,
        clubId,
        isPermmited: 'ACCEPTED',
      },
    });
    holderMemberId = holder.memberId;

    await prisma.roleAssignment.create({
      data: { clubId, memberId: holderMemberId, role: 'LEADER' },
    });

    const target = await prisma.member.create({
      data: {
        email: targetEmail,
        password: 'pw',
        name: '역할대상',
        enrollmentNumber: `member-role-target-${runId}`,
        clubId,
        isPermmited: 'ACCEPTED',
      },
    });
    targetMemberId = target.memberId;

    const subukMember = await prisma.member.create({
      data: {
        email: subukEmail,
        password: 'pw',
        name: '수북보유',
        enrollmentNumber: `member-role-subuk-${runId}`,
        clubId,
        isPermmited: 'ACCEPTED',
      },
    });
    memberWithSubukId = subukMember.memberId;

    await prisma.roleAssignment.create({
      data: { clubId, memberId: memberWithSubukId, role: 'SUBUK' },
    });

    const noClub = await prisma.member.create({
      data: {
        email: noClubEmail,
        password: 'pw',
        name: '동아리없음',
        enrollmentNumber: `member-role-noclub-${runId}`,
        clubId: null,
        isPermmited: 'ACCEPTED',
      },
    });
    noClubMemberId = noClub.memberId;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.roleAssignment.deleteMany({ where: { clubId } });
    await prisma.member.deleteMany({
      where: {
        memberId: {
          in: [
            holderMemberId,
            targetMemberId,
            memberWithSubukId,
            noClubMemberId,
          ],
        },
      },
    });
    await prisma.club.delete({ where: { clubId } });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('assignRole', () => {
    it('회원이 없으면 BadRequestException을 던진다', async () => {
      await expect(
        service.assignRole(9_999_999, ['패짱']),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('동아리가 없는 회원이면 BadRequestException을 던진다', async () => {
      await expect(
        service.assignRole(noClubMemberId, ['패짱']),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('transaction 내에서 대상 회원의 기존 역할을 삭제하고 새 역할을 배정한다', async () => {
      const result = await service.assignRole(memberWithSubukId, ['패짱']);

      expect(result).toEqual({ message: '역할 배정이 완료되었어요.' });

      const roles = await prisma.roleAssignment.findMany({
        where: { memberId: memberWithSubukId, clubId },
      });
      expect(roles).toHaveLength(1);
      expect(roles[0]!.role).toBe('LEADER');

      const subukRows = await prisma.roleAssignment.findMany({
        where: { clubId, role: 'SUBUK' },
      });
      expect(subukRows).toHaveLength(0);
    });

    it('다른 회원이 보유한 역할을 요청하면 이전 holder에서 새 회원으로 이전한다', async () => {
      const result = await service.assignRole(targetMemberId, ['패짱']);

      expect(result).toEqual({ message: '역할 배정이 완료되었어요.' });

      const leaderRows = await prisma.roleAssignment.findMany({
        where: { clubId, role: 'LEADER' },
      });
      expect(leaderRows).toHaveLength(1);
      expect(leaderRows[0]!.memberId).toBe(targetMemberId);

      const holderRoles = await prisma.roleAssignment.findMany({
        where: { memberId: holderMemberId, clubId },
      });
      expect(holderRoles).toHaveLength(0);
    });

    it('기존 row가 있는 역할은 update, 없는 역할은 create한다', async () => {
      const mixedMember = await prisma.member.create({
        data: {
          email: `member-role-mixed-${runId}@integration.test`,
          password: 'pw',
          name: '혼합배정',
          enrollmentNumber: `member-role-mixed-${runId}`,
          clubId,
          isPermmited: 'ACCEPTED',
        },
      });

      try {
        await prisma.roleAssignment.create({
          data: { clubId, memberId: holderMemberId, role: 'SANGSOE' },
        });

        const result = await service.assignRole(mixedMember.memberId, [
          '패짱',
          '상쇠',
        ]);

        expect(result).toEqual({ message: '역할 배정이 완료되었어요.' });

        const memberRoles = await prisma.roleAssignment.findMany({
          where: { memberId: mixedMember.memberId, clubId },
          orderBy: { role: 'asc' },
        });
        expect(memberRoles.map((r) => r.role).sort()).toEqual(
          ['LEADER', 'SANGSOE'].sort(),
        );

        const leaderRow = await prisma.roleAssignment.findFirst({
          where: { clubId, role: 'LEADER' },
        });
        expect(leaderRow!.memberId).toBe(mixedMember.memberId);

        const sangsoeRow = await prisma.roleAssignment.findFirst({
          where: { clubId, role: 'SANGSOE' },
        });
        expect(sangsoeRow!.memberId).toBe(mixedMember.memberId);
      } finally {
        await prisma.roleAssignment.deleteMany({
          where: { memberId: mixedMember.memberId },
        });
        await prisma.member.delete({ where: { memberId: mixedMember.memberId } });
      }
    });
  });
});
