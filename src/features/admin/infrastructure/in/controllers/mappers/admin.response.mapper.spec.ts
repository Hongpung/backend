import { describe, expect, it } from '@jest/globals';
import { AdminEntity } from '../../../../domain/admin.entity';
import { ClubVO } from '../../../../domain/club.vo';
import { AdminResponseMapper } from './admin.response.mapper';

function adminEntityFixture(): AdminEntity {
  return AdminEntity.create({
    memberId: 7,
    email: 'admin@test.com',
    name: '관리자',
    nickname: '어드민',
    enrollmentNumber: '2020000007',
    clubId: 3,
    club: ClubVO.create({ clubId: 3, clubName: '홍풍' }),
    adminLevel: 'SUPER',
  });
}

describe('AdminResponseMapper', () => {
  it('toSimpleDto는 clubName과 adminLevel을 반영한다', () => {
    const dto = AdminResponseMapper.toSimpleDto(adminEntityFixture());

    expect(dto).toEqual({
      memberId: 7,
      name: '관리자',
      nickname: '어드민',
      club: '홍풍',
      enrollmentNumber: '2020000007',
      adminLevel: 'SUPER',
    });
  });

  it('club이 null이면 club 필드는 null이다', () => {
    const entity = AdminEntity.create({
      memberId: 1,
      email: 'a@test.com',
      name: 'n',
      nickname: null,
      enrollmentNumber: '1',
      clubId: null,
      club: null,
      adminLevel: 'SUB',
    });

    expect(AdminResponseMapper.toSimpleDto(entity).club).toBeNull();
  });

  it('toListDto는 각 entity를 simple DTO로 매핑한다', () => {
    const entity = adminEntityFixture();

    expect(AdminResponseMapper.toListDto([entity])).toEqual({
      admins: [AdminResponseMapper.toSimpleDto(entity)],
    });
  });
});
