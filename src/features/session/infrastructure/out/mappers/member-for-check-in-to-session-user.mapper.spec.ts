import { describe, expect, it } from '@jest/globals';
import { RoleEnum } from 'src/role/role.enum';
import type {
  MemberForCheckIn,
  MemberForCheckInWithClubAndRoles,
} from '../../../application/ports/out/session.repository.port';
import { MemberForCheckInToSessionUserMapper } from './member-for-check-in-to-session-user.mapper';

function memberFixture(
  overrides: Partial<MemberForCheckIn> = {},
): MemberForCheckInWithClubAndRoles {
  return {
    memberId: 1,
    email: 'user@test.com',
    name: '홍길동',
    nickname: '길동',
    club: { clubName: '풍물패' },
    profileImageUrl: 'https://example.com/p.png',
    enrollmentNumber: '20240001',
    roleAssignment: [{ role: 'LEADER' }, { role: 'SANGSOE' }],
    ...overrides,
  } as MemberForCheckInWithClubAndRoles;
}

describe('MemberForCheckInToSessionUserMapper', () => {
  it('MemberForCheckIn을 SessionUser로 매핑한다', () => {
    const member = memberFixture();

    const sessionUser =
      MemberForCheckInToSessionUserMapper.toSessionUser(member);

    expect(sessionUser).toEqual({
      memberId: 1,
      email: 'user@test.com',
      name: '홍길동',
      nickname: '길동',
      club: '풍물패',
      enrollmentNumber: '20240001',
      role: [RoleEnum.EnToKo('LEADER'), RoleEnum.EnToKo('SANGSOE')],
      profileImageUrl: 'https://example.com/p.png',
    });
  });

  it('nickname과 profileImageUrl이 null이면 그대로 전달한다', () => {
    const member = memberFixture({
      nickname: null,
      profileImageUrl: null,
    });

    const sessionUser =
      MemberForCheckInToSessionUserMapper.toSessionUser(member);

    expect(sessionUser.nickname).toBeNull();
    expect(sessionUser.profileImageUrl).toBeNull();
  });
});
