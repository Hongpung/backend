import { describe, expect, it } from '@jest/globals';
import type { MemberLookupReadModel } from 'src/features/member/application/ports/in/member-lookup.read-model';
import { toLiveNotificationMemberRegistration } from './member-to-live-notification.mapper';

function readModelFixture(
  overrides?: Partial<MemberLookupReadModel>,
): MemberLookupReadModel {
  return {
    memberId: 42,
    name: '홍길동',
    nickname: null,
    enrollmentNumber: '2021000000',
    email: 'hong@test.com',
    clubName: '동아리A',
    roles: ['LEADER'],
    profileImageUrl: null,
    instagramUrl: null,
    blogUrl: null,
    notificationToken: 'ExponentPushToken[abc]',
    ...overrides,
  };
}

describe('toLiveNotificationMemberRegistration', () => {
  it('MemberLookupReadModel을 LiveNotificationMemberRegistration으로 매핑한다', () => {
    const member = readModelFixture();

    expect(toLiveNotificationMemberRegistration(member)).toEqual({
      memberId: 42,
      expoToken: 'ExponentPushToken[abc]',
    });
  });

  it('notificationToken이 null이면 expoToken도 null이다', () => {
    const member = readModelFixture({ notificationToken: null });

    expect(toLiveNotificationMemberRegistration(member).expoToken).toBeNull();
  });
});
