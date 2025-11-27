import { describe, expect, it } from '@jest/globals';
import { MemberEntity } from '../../../../domain/member.entity';
import { MemberResponseMapper } from './member.response.mapper';

function memberEntityFixture(): MemberEntity {
  return MemberEntity.create({
    memberId: 1,
    name: '홍길동',
    nickname: '닉',
    enrollmentNumber: '2021000001',
    email: 'hong@test.com',
    clubId: 10,
    club: { clubId: 10, clubName: 'Hongpung' },
    roleAssignment: [{ role: 'LEADER' }],
    isPermmited: 'ACCEPTED',
    profileImageUrl: 'https://img.test/a.png',
    instagramUrl: null,
    blogUrl: null,
  });
}

describe('MemberResponseMapper', () => {
  it('toDetailDto는 entity 필드와 한글 역할·동아리명을 반영한다', () => {
    const entity = memberEntityFixture();

    const dto = MemberResponseMapper.toDetailDto(entity);

    expect(dto.memberId).toBe(1);
    expect(dto.name).toBe('홍길동');
    expect(dto.club).toBe('Hongpung');
    expect(dto.role).toEqual(entity.getRolesAsKorean());
    expect(dto.profileImageUrl).toBe('https://img.test/a.png');
  });

  it('toListItemDto는 detail과 동일한 공개 필드를 매핑한다', () => {
    const entity = memberEntityFixture();

    const list = MemberResponseMapper.toListItemDto(entity);
    const detail = MemberResponseMapper.toDetailDto(entity);

    expect(list).toEqual(detail);
  });
});
