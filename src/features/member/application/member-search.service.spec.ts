import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { MemberSearchService } from './member-search.service';
import { MemberEntity } from '../domain/member.entity';
import type { IMemberRepository } from './ports/out/member.repository.port';

function createMember(memberId: number, opts?: { clubId?: number | null }) {
  const clubId =
    opts === undefined ? 1 : opts.clubId === undefined ? 1 : opts.clubId;
  return MemberEntity.create({
    memberId,
    name: `M${memberId}`,
    nickname: null,
    enrollmentNumber: '2021000001',
    email: `m${memberId}@test.com`,
    clubId,
    club:
      clubId !== null && clubId !== undefined
        ? { clubId, clubName: `Club${clubId}` }
        : null,
    roleAssignment: [],
    isPermmited: 'ACCEPTED',
    profileImageUrl: null,
    instagramUrl: null,
    blogUrl: null,
  });
}

describe('MemberSearchService', () => {
  let service: MemberSearchService;
  let repository: jest.Mocked<IMemberRepository>;

  beforeEach(() => {
    repository = {
      countMembersByCondition: jest.fn(),
      findMembersByConditionPaginated: jest.fn(),
      findMembersByCondition: jest.fn(),
      findMemberByMemberId: jest.fn(),
    } as unknown as jest.Mocked<IMemberRepository>;

    service = new MemberSearchService(repository);
  });

  describe('searchMembers', () => {
    it('isPermitted 기본값은 ACCEPTED이고 pageSize 미지정 시 20이다', async () => {
      repository.countMembersByCondition.mockResolvedValue(5);
      repository.findMembersByConditionPaginated.mockResolvedValue([
        createMember(1),
      ]);

      await service.searchMembers({ page: 0 });

      expect(repository.countMembersByCondition).toHaveBeenCalledWith(
        expect.objectContaining({ isPermitted: 'ACCEPTED' }),
      );
      expect(repository.findMembersByConditionPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ isPermitted: 'ACCEPTED' }),
        0,
        20,
        { enrollmentNumber: 'asc' },
      );
    });

    it('totalPages는 ceil(totalCount / pageSize)이다', async () => {
      repository.countMembersByCondition.mockResolvedValue(45);
      repository.findMembersByConditionPaginated.mockResolvedValue([]);

      const r = await service.searchMembers({ page: 0, pageSize: 20 });

      expect(r.totalPages).toBe(3);
      expect(r.pageSize).toBe(20);
    });

    it('clubId가 0이면 repository에 clubId 0 조건을 전달한다', async () => {
      repository.countMembersByCondition.mockResolvedValue(1);
      repository.findMembersByConditionPaginated.mockResolvedValue([
        createMember(1, { clubId: 0 }),
      ]);

      await service.searchMembers({ clubId: 0, page: 0 });

      expect(repository.countMembersByCondition).toHaveBeenCalledWith(
        expect.objectContaining({ clubId: 0, isPermitted: 'ACCEPTED' }),
      );
      expect(repository.findMembersByConditionPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ clubId: 0, isPermitted: 'ACCEPTED' }),
        0,
        20,
        { enrollmentNumber: 'asc' },
      );
    });
  });

  describe('getInvitePossibleList', () => {
    it('필터가 없으면 빈 조건으로 조회하고 본인을 제외한다', async () => {
      const self = createMember(5);
      const other = createMember(6);
      repository.findMembersByCondition.mockResolvedValue([self, other]);

      const list = await service.getInvitePossibleList(5, {});

      expect(repository.findMembersByCondition).toHaveBeenCalledWith({});
      expect(list).toEqual([other]);
    });
  });

  describe('getRegularParticipatorRecommand', () => {
    it('멤버가 없으면 NotFoundException', async () => {
      repository.findMemberByMemberId.mockResolvedValue(null);

      await expect(
        service.getRegularParticipatorRecommand(1),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('동아리가 없으면(hasClub false) NotFoundException', async () => {
      const m = createMember(1, { clubId: null });
      repository.findMemberByMemberId.mockResolvedValue(m);

      await expect(
        service.getRegularParticipatorRecommand(1),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('같은 동아리 ACCEPTED 목록에서 본인을 제외한다', async () => {
      const me = createMember(1, { clubId: 10 });
      const peer = createMember(2, { clubId: 10 });
      repository.findMemberByMemberId.mockResolvedValue(me);
      repository.findMembersByCondition.mockResolvedValue([me, peer]);

      const list = await service.getRegularParticipatorRecommand(1);

      expect(repository.findMembersByCondition).toHaveBeenCalledWith({
        clubId: 10,
        isPermitted: 'ACCEPTED',
      });
      expect(list).toEqual([peer]);
    });
  });
});
