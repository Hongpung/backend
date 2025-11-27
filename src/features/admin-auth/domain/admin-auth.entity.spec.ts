import { describe, expect, it } from '@jest/globals';
import { AdminAuthEntity } from './admin-auth.entity';

describe('관리자 인증 엔티티', () => {
  describe('isAdmin', () => {
    it('adminLevel이 있으면 true', () => {
      expect(
        new AdminAuthEntity(1, 'a@b.com', 'hash', 'SUPER', null).isAdmin(),
      ).toBe(true);
      expect(
        new AdminAuthEntity(1, 'a@b.com', 'hash', 'SUB', 10).isAdmin(),
      ).toBe(true);
    });

    it('adminLevel이 null이면 false', () => {
      expect(
        new AdminAuthEntity(2, 'u@b.com', 'hash', null, null).isAdmin(),
      ).toBe(false);
    });
  });

  describe('toJwtPayload', () => {
    it('memberId·adminLevel·clubId를 JWT 클레임 형태로 매핑한다', () => {
      const entity = new AdminAuthEntity(
        42,
        'admin@example.com',
        'secret-hash',
        'SUB',
        99,
      );
      expect(entity.toJwtPayload()).toEqual({
        adminId: 42,
        adminRole: 'SUB',
        clubId: 99,
      });
    });

    it('adminLevel과 clubId가 null이면 페이로드에도 null을 유지한다', () => {
      const entity = new AdminAuthEntity(
        7,
        'member@example.com',
        'hash',
        null,
        null,
      );
      expect(entity.toJwtPayload()).toEqual({
        adminId: 7,
        adminRole: null,
        clubId: null,
      });
    });
  });
});
