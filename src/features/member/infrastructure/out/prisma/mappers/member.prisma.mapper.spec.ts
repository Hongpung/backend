import { describe, expect, it } from '@jest/globals';
import type { Member, RoleAssignment, Club } from '@prisma/client';
import { MemberPrismaMapper } from './member.prisma.mapper';

type FixtureInput = Partial<Member> & {
  club?: Club | null;
  roleAssignment?: RoleAssignment[];
};

function prismaMemberFixture(input: FixtureInput = {}): Member & {
  club: Club | null;
  roleAssignment: RoleAssignment[];
} {
  const {
    club: clubOverride,
    roleAssignment: roleAssignments = [],
    ...memberOverrides
  } = input;

  const member: Member = {
    memberId: 1,
    name: '이름',
    nickname: null,
    enrollmentNumber: '2021000001',
    email: 'e@test.com',
    password: 'pw',
    clubId: 10,
    adminLevel: null,
    profileImageUrl: null,
    instagramUrl: null,
    blogUrl: null,
    pushEnable: false,
    notificationToken: null,
    isPermmited: 'ACCEPTED',
    ...memberOverrides,
  };

  let club: Club | null;
  if (clubOverride !== undefined) {
    club = clubOverride;
  } else if (member.clubId === null || member.clubId === undefined) {
    club = null;
  } else {
    club = {
      clubId: member.clubId,
      clubName: '테스트동아리',
      profileImageUrl: null,
    };
  }

  return { ...member, club, roleAssignment: roleAssignments };
}

describe('MemberPrismaMapper', () => {
  it('club이 null이고 roleAssignment가 비어 있으면 hasClub는 false이고 역할은 없다', () => {
    const row = prismaMemberFixture({
      clubId: null,
      club: null,
      roleAssignment: [],
    });

    const domain = MemberPrismaMapper.toDomain(row);

    expect(domain.hasClub()).toBe(false);
    expect(domain.getRoles()).toEqual([]);
  });

  it('club이 있으면 getClubName으로 동아리명을 반환한다', () => {
    const row = prismaMemberFixture({
      club: {
        clubId: 10,
        clubName: 'Hongpung',
        profileImageUrl: null,
      },
    });

    const domain = MemberPrismaMapper.toDomain(row);

    expect(domain.getClubName()).toBe('Hongpung');
  });

  it('Prisma isPermmited 값으로 승인 상태 판별이 동작한다', () => {
    const row = prismaMemberFixture({
      isPermmited: 'PENDING',
    });
    const domain = MemberPrismaMapper.toDomain(row);

    expect(domain.isPending()).toBe(true);
    expect(domain.isAccepted()).toBe(false);
  });
});
