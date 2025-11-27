import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import {
  connectIntegrationTestDatabase,
  disconnectIntegrationTestDatabase,
  isIntegrationDatabaseConfigured,
} from '../../../../test/prisma/integration-test-database';
import type { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { IMemberRepository } from './ports/out/member.repository.port';
import { MemberSearchService } from './member-search.service';
import { MemberPrismaRepository } from '../infrastructure/out/prisma/member.prisma.repository';

const describeIntegration = isIntegrationDatabaseConfigured()
  ? describe
  : describe.skip;

describeIntegration('MemberSearchService (통합)', () => {
  let prisma: PrismaClient;
  let searchService: MemberSearchService;

  const runId = Date.now();
  let searchClubId: number;
  let otherClubId: number;
  let selfMemberId: number;
  let pendingMemberId: number;
  let peerMemberId: number;
  let otherClubMemberId: number;
  let noClubMemberId: number;
  const paginationMemberIds: number[] = [];
  const inviteMemberIds: number[] = [];

  beforeAll(async () => {
    prisma = await connectIntegrationTestDatabase();

    const repository = new MemberPrismaRepository(
      prisma as unknown as PrismaService,
    );
    searchService = new MemberSearchService(
      repository as unknown as IMemberRepository,
    );

    const maxClub = await prisma.club.aggregate({ _max: { clubId: true } });
    searchClubId = (maxClub._max.clubId ?? 0) + 52_000;
    otherClubId = searchClubId + 1;

    await prisma.club.createMany({
      data: [
        {
          clubId: searchClubId,
          clubName: `member-search-club-${runId}`,
          profileImageUrl: null,
        },
        {
          clubId: otherClubId,
          clubName: `member-search-other-${runId}`,
          profileImageUrl: null,
        },
      ],
    });

    const self = await prisma.member.create({
      data: {
        email: `member-search-self-${runId}@integration.test`,
        password: 'pw',
        name: '검색본인',
        enrollmentNumber: `member-search-self-${runId}`,
        clubId: searchClubId,
        isPermmited: 'ACCEPTED',
      },
    });
    selfMemberId = self.memberId;

    const peer = await prisma.member.create({
      data: {
        email: `member-search-peer-${runId}@integration.test`,
        password: 'pw',
        name: '검색동료',
        enrollmentNumber: `member-search-peer-${runId}`,
        clubId: searchClubId,
        isPermmited: 'ACCEPTED',
      },
    });
    peerMemberId = peer.memberId;

    const pending = await prisma.member.create({
      data: {
        email: `member-search-pending-${runId}@integration.test`,
        password: 'pw',
        name: '승인대기',
        enrollmentNumber: `member-search-pending-${runId}`,
        clubId: searchClubId,
        isPermmited: 'PENDING',
      },
    });
    pendingMemberId = pending.memberId;

    const otherClubMember = await prisma.member.create({
      data: {
        email: `member-search-other-club-${runId}@integration.test`,
        password: 'pw',
        name: '타동아리',
        enrollmentNumber: `member-search-other-club-${runId}`,
        clubId: otherClubId,
        isPermmited: 'ACCEPTED',
      },
    });
    otherClubMemberId = otherClubMember.memberId;

    const noClub = await prisma.member.create({
      data: {
        email: `member-search-noclub-${runId}@integration.test`,
        password: 'pw',
        name: '동아리없음',
        enrollmentNumber: `member-search-noclub-${runId}`,
        clubId: null,
        isPermmited: 'ACCEPTED',
      },
    });
    noClubMemberId = noClub.memberId;

    for (let i = 1; i <= 25; i += 1) {
      const suffix = String(i).padStart(2, '0');
      const created = await prisma.member.create({
        data: {
          email: `member-search-pag-${runId}-${suffix}@integration.test`,
          password: 'pw',
          name: `페이지멤버${suffix}`,
          enrollmentNumber: `member-search-pag-${runId}-${suffix}`,
          clubId: searchClubId,
          isPermmited: 'ACCEPTED',
        },
      });
      paginationMemberIds.push(created.memberId);
    }

    const inviteTarget = await prisma.member.create({
      data: {
        email: `member-search-invite-${runId}@integration.test`,
        password: 'pw',
        name: '초대대상',
        enrollmentNumber: `member-search-invite-${runId}`,
        clubId: searchClubId,
        isPermmited: 'ACCEPTED',
      },
    });
    inviteMemberIds.push(inviteTarget.memberId);
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.roleAssignment.deleteMany({
      where: {
        memberId: {
          in: [
            selfMemberId,
            peerMemberId,
            pendingMemberId,
            otherClubMemberId,
            noClubMemberId,
            ...paginationMemberIds,
            ...inviteMemberIds,
          ],
        },
      },
    });
    await prisma.member.deleteMany({
      where: {
        memberId: {
          in: [
            selfMemberId,
            peerMemberId,
            pendingMemberId,
            otherClubMemberId,
            noClubMemberId,
            ...paginationMemberIds,
            ...inviteMemberIds,
          ],
        },
      },
    });
    await prisma.club.deleteMany({
      where: { clubId: { in: [searchClubId, otherClubId] } },
    });

    await disconnectIntegrationTestDatabase(prisma);
  });

  describe('searchMembers', () => {
    it('기본 isPermitted는 ACCEPTED이며 PENDING 회원은 제외된다', async () => {
      const result = await searchService.searchMembers({
        clubId: searchClubId,
        page: 0,
      });

      const ids = result.members.map((m) => m.memberId);
      expect(ids).not.toContain(pendingMemberId);
      expect(result.members.every((m) => m.isPermmited === 'ACCEPTED')).toBe(
        true,
      );
    });

    it('pageSize 미지정 시 기본값 20을 사용한다', async () => {
      const result = await searchService.searchMembers({
        clubId: searchClubId,
        page: 0,
      });

      expect(result.pageSize).toBe(20);
      expect(result.members.length).toBeLessThanOrEqual(20);
    });

    it('totalCount·totalPages·page 슬라이스가 올바르게 계산된다', async () => {
      const page0 = await searchService.searchMembers({
        clubId: searchClubId,
        page: 0,
        pageSize: 10,
      });

      expect(page0.totalCount).toBeGreaterThanOrEqual(28);
      expect(page0.totalPages).toBe(Math.ceil(page0.totalCount / 10));
      expect(page0.page).toBe(0);
      expect(page0.members).toHaveLength(10);

      const page1 = await searchService.searchMembers({
        clubId: searchClubId,
        page: 1,
        pageSize: 10,
      });

      expect(page1.members).toHaveLength(10);
      const page0Ids = new Set(page0.members.map((m) => m.memberId));
      for (const member of page1.members) {
        expect(page0Ids.has(member.memberId)).toBe(false);
      }
    });

    it('clubId 필터로 해당 동아리 회원만 조회한다', async () => {
      const result = await searchService.searchMembers({
        clubId: otherClubId,
        page: 0,
        pageSize: 50,
      });

      expect(result.totalCount).toBe(1);
      expect(result.members).toHaveLength(1);
      expect(result.members[0]!.memberId).toBe(otherClubMemberId);
    });

    it('pageSize 50을 지정하면 허용된 페이지 크기로 조회한다', async () => {
      const result = await searchService.searchMembers({
        clubId: searchClubId,
        page: 0,
        pageSize: 50,
      });

      expect(result.pageSize).toBe(50);
      expect(result.members.length).toBeGreaterThan(20);
      expect(result.members.length).toBeLessThanOrEqual(50);
    });
  });

  describe('getInvitePossibleList', () => {
    it('clubIds 필터로 조회하고 본인은 결과에서 제외한다', async () => {
      const list = await searchService.getInvitePossibleList(selfMemberId, {
        clubIds: [searchClubId],
      });

      expect(list.every((m) => m.memberId !== selfMemberId)).toBe(true);
      expect(list.every((m) => m.clubId === searchClubId)).toBe(true);
      expect(list.some((m) => m.memberId === peerMemberId)).toBe(true);
    });

    it('username 필터로 조회하고 본인은 결과에서 제외한다', async () => {
      const list = await searchService.getInvitePossibleList(selfMemberId, {
        username: '초대대상',
      });

      expect(list.every((m) => m.memberId !== selfMemberId)).toBe(true);
      expect(list).toHaveLength(1);
      expect(list[0]!.name).toBe('초대대상');
    });
  });

  describe('getRegularParticipatorRecommand', () => {
    it('존재하지 않는 memberId면 NotFoundException을 던진다', async () => {
      await expect(
        searchService.getRegularParticipatorRecommand(selfMemberId + 99_999),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('동아리가 없는 회원이면 NotFoundException을 던진다', async () => {
      await expect(
        searchService.getRegularParticipatorRecommand(noClubMemberId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('같은 동아리 ACCEPTED 동료만 반환하고 본인·PENDING은 제외한다', async () => {
      const list =
        await searchService.getRegularParticipatorRecommand(selfMemberId);

      expect(list.every((m) => m.memberId !== selfMemberId)).toBe(true);
      expect(list.every((m) => m.isPermmited === 'ACCEPTED')).toBe(true);
      expect(list.every((m) => m.clubId === searchClubId)).toBe(true);
      expect(list.some((m) => m.memberId === peerMemberId)).toBe(true);
      expect(list.some((m) => m.memberId === pendingMemberId)).toBe(false);
    });
  });
});
