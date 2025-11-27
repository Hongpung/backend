import { describe, expect, it } from '@jest/globals';
import { MemberAuthEntity } from '../../../../domain/member-auth.entity';
import { MemberAuthPrismaMapper } from './member-auth.prisma.mapper';

describe('MemberAuthPrismaMapper', () => {
  it('toDomain은 MemberAuthEntity로 변환한다', () => {
    const entity = MemberAuthPrismaMapper.toDomain({
      memberId: 10,
      email: 'a@test.com',
      password: 'secret',
    });
    expect(entity).toBeInstanceOf(MemberAuthEntity);
    expect(entity.memberId).toBe(10);
    expect(entity.email).toBe('a@test.com');
    expect(entity.password).toBe('secret');
  });

  it('toDomainOrNull은 null 입력 시 null을 반환한다', () => {
    expect(MemberAuthPrismaMapper.toDomainOrNull(null)).toBeNull();
  });

  it('toDomainOrNull은 데이터가 있으면 toDomain과 동일한 결과를 반환한다', () => {
    const row = { memberId: 3, email: 'b@test.com', password: 'p' };
    const entity = MemberAuthPrismaMapper.toDomainOrNull(row);
    expect(entity).toBeInstanceOf(MemberAuthEntity);
    expect(entity).toEqual(MemberAuthPrismaMapper.toDomain(row));
  });
});
