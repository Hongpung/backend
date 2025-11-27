import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MemberLookupUseCase } from 'src/features/member/application/ports/in/member-lookup.use-case';
import { PushNotificationMemberLookupAdapter } from './push-notification-member-lookup.adapter';

describe('PushNotificationMemberLookupAdapter', () => {
  let memberLookupUseCase: jest.Mocked<MemberLookupUseCase>;
  let adapter: PushNotificationMemberLookupAdapter;

  beforeEach(() => {
    memberLookupUseCase = {
      findMembersByIds: jest.fn(),
      findMemberByMemberId: jest.fn(),
      existsMember: jest.fn(),
    } as unknown as jest.Mocked<MemberLookupUseCase>;
    adapter = new PushNotificationMemberLookupAdapter(memberLookupUseCase);
  });

  it('existsMember를 MemberLookupUseCase에 위임한다', async () => {
    memberLookupUseCase.existsMember.mockResolvedValue(true);

    await expect(adapter.existsMember(3)).resolves.toBe(true);

    expect(memberLookupUseCase.existsMember).toHaveBeenCalledWith(3);
  });
});
