import { describe, expect, it } from '@jest/globals';
import type { Member, RoleAssignment } from '@prisma/client';
import {
  MEMBER_FOR_CHECK_IN_INCLUDE,
  SessionPrismaMapper,
  type MemberForCheckInRow,
} from './session.prisma.mapper';

type FixtureInput = Partial<Member> & {
  club?: { clubName: string } | null;
  roleAssignment?: RoleAssignment[];
};

function memberForCheckInRowFixture(
  input: FixtureInput = {},
): MemberForCheckInRow {
  const {
    club: clubOverride,
    roleAssignment: roleAssignments = [],
    ...memberOverrides
  } = input;

  const member: Member = {
    memberId: 1,
    name: '홍길동',
    nickname: '닉네임',
    enrollmentNumber: '2021000001',
    email: 'user@test.com',
    password: 'pw',
    clubId: 10,
    adminLevel: null,
    profileImageUrl: 'https://example.com/p.png',
    instagramUrl: null,
    blogUrl: null,
    pushEnable: false,
    notificationToken: null,
    isPermmited: 'ACCEPTED',
    ...memberOverrides,
  };

  let club: { clubName: string } | null;
  if (clubOverride !== undefined) {
    club = clubOverride;
  } else if (member.clubId === null || member.clubId === undefined) {
    club = null;
  } else {
    club = { clubName: '테스트동아리' };
  }

  return {
    ...member,
    club,
    roleAssignment: roleAssignments,
  };
}

describe('MEMBER_FOR_CHECK_IN_INCLUDE', () => {
  it('club과 roleAssignment 관계를 select한다', () => {
    expect(MEMBER_FOR_CHECK_IN_INCLUDE).toEqual({
      club: { select: { clubName: true } },
      roleAssignment: { select: { role: true } },
    });
  });
});

describe('SessionPrismaMapper.toMemberForCheckIn', () => {
  it('club이 null이면 club 필드는 null이다', () => {
    const row = memberForCheckInRowFixture({
      clubId: null,
      club: null,
      roleAssignment: [],
    });

    const result = SessionPrismaMapper.toMemberForCheckIn(row);

    expect(result.club).toBeNull();
    expect(result.roleAssignment).toEqual([]);
  });

  it('club과 roleAssignment를 MemberForCheckIn으로 매핑한다', () => {
    const row = memberForCheckInRowFixture({
      club: { clubName: 'Hongpung' },
      roleAssignment: [
        {
          memberId: 1,
          role: 'LEADER',
        } as RoleAssignment,
      ],
    });

    const result = SessionPrismaMapper.toMemberForCheckIn(row);

    expect(result).toEqual({
      memberId: row.memberId,
      email: row.email,
      name: row.name,
      nickname: row.nickname,
      club: { clubName: 'Hongpung' },
      profileImageUrl: row.profileImageUrl,
      enrollmentNumber: row.enrollmentNumber,
      roleAssignment: [{ role: 'LEADER' }],
    });
  });
});
