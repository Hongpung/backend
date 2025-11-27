import { describe, expect, it } from '@jest/globals';
import { MemberEntity } from './member.entity';

function createMember(
  overrides?: Partial<Parameters<typeof MemberEntity.create>[0]>,
) {
  return MemberEntity.create({
    memberId: 1,
    name: '홍길동',
    nickname: null,
    enrollmentNumber: '2021000000',
    email: 'hong@test.com',
    clubId: 1,
    club: { clubId: 1, clubName: '동아리A' },
    roleAssignment: [{ role: 'LEADER' }],
    isPermmited: 'ACCEPTED',
    profileImageUrl: null,
    instagramUrl: null,
    blogUrl: null,
    ...overrides,
  });
}

describe('MemberEntity', () => {
  describe('getDisplayName', () => {
    it('닉네임이 있으면 닉네임을 반환한다', () => {
      const m = createMember({ nickname: '길동이' });
      expect(m.getDisplayName()).toBe('길동이');
    });

    it('닉네임이 null이면 이름을 반환한다', () => {
      const m = createMember({ nickname: null });
      expect(m.getDisplayName()).toBe('홍길동');
    });
  });

  describe('hasClub', () => {
    it('clubId와 club이 모두 있으면 true이다', () => {
      expect(createMember().hasClub()).toBe(true);
    });

    it('clubId가 null이면 false이다', () => {
      const m = createMember({
        clubId: null,
        club: { clubId: 999, clubName: 'X' },
      });
      expect(m.hasClub()).toBe(false);
    });

    it('club 객체가 null이면 false이다', () => {
      const m = createMember({ clubId: 1, club: null });
      expect(m.hasClub()).toBe(false);
    });
  });

  describe('승인 상태', () => {
    it('ACCEPTED면 isAccepted·canLogin은 true, pending·denied는 false', () => {
      const m = createMember({ isPermmited: 'ACCEPTED' });
      expect(m.isAccepted()).toBe(true);
      expect(m.canLogin()).toBe(true);
      expect(m.isPending()).toBe(false);
      expect(m.isDenied()).toBe(false);
    });

    it('PENDING이면 isPending만 true', () => {
      const m = createMember({ isPermmited: 'PENDING' });
      expect(m.isPending()).toBe(true);
      expect(m.isAccepted()).toBe(false);
      expect(m.canLogin()).toBe(false);
    });

    it('DENIED면 isDenied만 true', () => {
      const m = createMember({ isPermmited: 'DENIED' });
      expect(m.isDenied()).toBe(true);
      expect(m.isAccepted()).toBe(false);
    });
  });

  describe('역할', () => {
    it('hasRole·isLeader가 역할에 맞게 동작한다', () => {
      const m = createMember({
        roleAssignment: [{ role: 'LEADER' }, { role: 'SUBUK' }],
      });
      expect(m.hasRole('LEADER')).toBe(true);
      expect(m.isLeader()).toBe(true);
      expect(m.hasRole('SUBUGGU')).toBe(false);
      expect(m.hasAnyRole()).toBe(true);
    });

    it('역할이 없으면 hasAnyRole은 false', () => {
      const m = createMember({ roleAssignment: [] });
      expect(m.hasAnyRole()).toBe(false);
      expect(m.isLeader()).toBe(false);
    });

    it('getRoles와 getRolesAsString은 영문 역할 목록을 반환한다', () => {
      const m = createMember({
        roleAssignment: [{ role: 'LEADER' }],
      });
      expect(m.getRoles()).toEqual(['LEADER']);
      expect(m.getRolesAsString()).toEqual(['LEADER']);
    });

    it('getRolesAsKorean은 한글 역할 목록을 반환한다', () => {
      const m = createMember({
        roleAssignment: [{ role: 'LEADER' }],
      });
      expect(m.getRolesAsKorean()).toEqual(['패짱']);
    });
  });

  describe('프로필 미디어·SNS·푸시', () => {
    it('hasProfileImage는 null·빈 문자열이 아닐 때만 true', () => {
      expect(createMember({ profileImageUrl: null }).hasProfileImage()).toBe(
        false,
      );
      expect(createMember({ profileImageUrl: '' }).hasProfileImage()).toBe(
        false,
      );
      expect(
        createMember({ profileImageUrl: 'https://img' }).hasProfileImage(),
      ).toBe(true);
    });

    it('hasSnsLinks는 instagram 또는 blog가 비어 있지 않을 때 true', () => {
      expect(
        createMember({ instagramUrl: 'ig', blogUrl: null }).hasSnsLinks(),
      ).toBe(true);
      expect(
        createMember({ instagramUrl: null, blogUrl: 'blog' }).hasSnsLinks(),
      ).toBe(true);
      expect(
        createMember({ instagramUrl: null, blogUrl: null }).hasSnsLinks(),
      ).toBe(false);
    });

    it('hasNotificationToken은 null·빈 문자열이 아닐 때만 true', () => {
      expect(
        createMember({ notificationToken: null }).hasNotificationToken(),
      ).toBe(false);
      expect(
        createMember({ notificationToken: '' }).hasNotificationToken(),
      ).toBe(false);
      expect(
        createMember({ notificationToken: 'tok' }).hasNotificationToken(),
      ).toBe(true);
    });

    it('isPushEnabled는 pushEnable 필드를 반영한다', () => {
      expect(createMember({ pushEnable: true }).isPushEnabled()).toBe(true);
      expect(createMember({ pushEnable: false }).isPushEnabled()).toBe(false);
    });
  });

  describe('updateProfile', () => {
    it('undefined인 필드는 기존 값을 유지하고 null은 명시적으로 반영한다', () => {
      const m = createMember({
        nickname: 'old',
        profileImageUrl: 'https://old',
        instagramUrl: 'ig',
        blogUrl: 'b',
      });

      m.updateProfile({
        nickname: undefined,
        profileImageUrl: null,
        instagramUrl: undefined,
        blogUrl: null,
      });

      expect(m.nickname).toBe('old');
      expect(m.profileImageUrl).toBeNull();
      expect(m.instagramUrl).toBe('ig');
      expect(m.blogUrl).toBeNull();
    });

    it('값이 전달된 필드만 갱신된다', () => {
      const m = createMember({
        nickname: null,
        profileImageUrl: null,
        instagramUrl: null,
        blogUrl: null,
      });

      m.updateProfile({ nickname: 'new', instagramUrl: 'insta' });

      expect(m.nickname).toBe('new');
      expect(m.instagramUrl).toBe('insta');
      expect(m.profileImageUrl).toBeNull();
      expect(m.blogUrl).toBeNull();
    });
  });

  describe('getClubName', () => {
    it('club가 있으면 이름을 반환하고 없으면 null이다', () => {
      expect(createMember().getClubName()).toBe('동아리A');
      expect(createMember({ club: null }).getClubName()).toBeNull();
    });
  });
});
