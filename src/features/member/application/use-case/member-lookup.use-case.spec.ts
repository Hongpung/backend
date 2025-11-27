import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MemberEntity } from '../../domain/member.entity';
import type { IMemberRepository } from '../ports/out/member.repository.port';
import { MemberLookupService } from './member-lookup.use-case';

function createMember(memberId: number) {
  return MemberEntity.create({
    memberId,
    name: `회원${memberId}`,
    nickname: '별명',
    enrollmentNumber: '2021000001',
    email: `m${memberId}@test.com`,
    clubId: 1,
    club: { clubId: 1, clubName: '동아리A' },
    roleAssignment: [{ role: 'LEADER' }],
    isPermmited: 'ACCEPTED',
    profileImageUrl: null,
    instagramUrl: null,
    blogUrl: null,
    notificationToken: 'expo-token',
  });
}

describe('MemberLookupService', () => {
  let memberRepository: jest.Mocked<
    Pick<
      IMemberRepository,
      'findMembersByIds' | 'findMemberByMemberId' | 'existsMember'
    >
  >;
  let service: MemberLookupService;

  beforeEach(() => {
    memberRepository = {
      findMembersByIds: jest.fn(),
      findMemberByMemberId: jest.fn(),
      existsMember: jest.fn(),
    };
    service = new MemberLookupService(
      memberRepository as unknown as IMemberRepository,
    );
  });

  describe('findMembersByIds', () => {
    it('MemberEntity를 MemberLookupReadModel로 매핑해 반환한다', async () => {
      const member = createMember(1);
      memberRepository.findMembersByIds.mockResolvedValue([member]);

      const result = await service.findMembersByIds([1]);

      expect(memberRepository.findMembersByIds).toHaveBeenCalledWith([1]);
      expect(result).toEqual([
        {
          memberId: 1,
          name: '회원1',
          nickname: '별명',
          enrollmentNumber: '2021000001',
          email: 'm1@test.com',
          clubName: '동아리A',
          roles: ['LEADER'],
          profileImageUrl: null,
          blogUrl: null,
          instagramUrl: null,
          notificationToken: 'expo-token',
        },
      ]);
    });
  });

  describe('findMemberByMemberId', () => {
    it('회원이 없으면 null을 반환한다', async () => {
      memberRepository.findMemberByMemberId.mockResolvedValue(null);

      await expect(service.findMemberByMemberId(99)).resolves.toBeNull();
    });

    it('회원이 있으면 read model을 반환한다', async () => {
      memberRepository.findMemberByMemberId.mockResolvedValue(createMember(2));

      const result = await service.findMemberByMemberId(2);

      expect(result?.memberId).toBe(2);
      expect(result?.clubName).toBe('동아리A');
    });
  });

  describe('existsMember', () => {
    it('저장소 existsMember에 위임한다', async () => {
      memberRepository.existsMember.mockResolvedValue(true);

      await expect(service.existsMember(5)).resolves.toBe(true);
      expect(memberRepository.existsMember).toHaveBeenCalledWith(5);
    });
  });
});
