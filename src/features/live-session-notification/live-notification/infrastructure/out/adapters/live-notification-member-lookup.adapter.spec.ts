import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import type { MemberLookupReadModel } from 'src/features/member/application/ports/in/member-lookup.read-model';
import { MemberLookupUseCase } from 'src/features/member/application/ports/in/member-lookup.use-case';
import { LiveNotificationMemberLookupAdapter } from './live-notification-member-lookup.adapter';

describe('LiveNotificationMemberLookupAdapter', () => {
  let memberLookupUseCase: jest.Mocked<MemberLookupUseCase>;
  let adapter: LiveNotificationMemberLookupAdapter;

  beforeEach(() => {
    memberLookupUseCase = {
      findMembersByIds: jest.fn(),
      findMemberByMemberId: jest.fn(),
      existsMember: jest.fn(),
    } as unknown as jest.Mocked<MemberLookupUseCase>;
    adapter = new LiveNotificationMemberLookupAdapter(memberLookupUseCase);
  });

  it('회원이 있으면 등록용 read model을 반환한다', async () => {
    const member: MemberLookupReadModel = {
      memberId: 10,
      name: '회원',
      nickname: null,
      enrollmentNumber: '2021000001',
      email: 'm@test.com',
      clubName: null,
      roles: [],
      profileImageUrl: null,
      blogUrl: null,
      instagramUrl: null,
      notificationToken: 'expo-abc',
    };
    memberLookupUseCase.findMemberByMemberId.mockResolvedValue(member);

    await expect(adapter.loadMemberForRegistration(10)).resolves.toEqual({
      memberId: 10,
      expoToken: 'expo-abc',
    });

    expect(memberLookupUseCase.findMemberByMemberId).toHaveBeenCalledWith(10);
  });

  it('회원이 없으면 NotFoundException을 던진다', async () => {
    memberLookupUseCase.findMemberByMemberId.mockResolvedValue(null);

    await expect(adapter.loadMemberForRegistration(99)).rejects.toThrow(
      NotFoundException,
    );
  });
});
