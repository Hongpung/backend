import { describe, expect, it } from '@jest/globals';
import { MemberAuthEntity } from './member-auth.entity';

describe('MemberAuthEntity', () => {
  it('toJwtPayload clubId가 null이면 clubId를 0으로 매핑한다', () => {
    const entity = new MemberAuthEntity(1, 'user@test.com', 'hashed');
    expect(entity.toJwtPayload({ clubId: null })).toEqual({
      memberId: 1,
      email: 'user@test.com',
      clubId: 0,
    });
  });

  it('toJwtPayload clubId가 있으면 그대로 포함한다', () => {
    const entity = new MemberAuthEntity(2, 'two@test.com', 'hashed2');
    expect(entity.toJwtPayload({ clubId: 5 })).toEqual({
      memberId: 2,
      email: 'two@test.com',
      clubId: 5,
    });
  });

  it('toJwtPayload sid가 있으면 포함한다', () => {
    const entity = new MemberAuthEntity(3, 'three@test.com', 'h');
    expect(entity.toJwtPayload({ clubId: 1, sid: 'session-uuid' })).toEqual({
      memberId: 3,
      email: 'three@test.com',
      clubId: 1,
      sid: 'session-uuid',
    });
  });
});
