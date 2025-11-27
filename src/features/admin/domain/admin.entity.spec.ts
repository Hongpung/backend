import { describe, expect, it } from '@jest/globals';
import { AdminEntity } from './admin.entity';

function makeAdmin(
  overrides: Partial<{
    memberId: number;
    adminLevel: 'SUPER' | 'SUB' | null;
  }> = {},
) {
  return AdminEntity.create({
    memberId: 1,
    email: 'a@b.com',
    name: 'n',
    nickname: null,
    enrollmentNumber: 'en',
    clubId: null,
    club: null,
    adminLevel: 'SUPER',
    ...overrides,
  });
}

describe('관리자 엔티티', () => {
  describe('isSuperAdmin', () => {
    it('adminLevel이 SUPER이면 true', () => {
      expect(makeAdmin({ adminLevel: 'SUPER' }).isSuperAdmin()).toBe(true);
    });

    it('adminLevel이 SUB이면 false', () => {
      expect(makeAdmin({ adminLevel: 'SUB' }).isSuperAdmin()).toBe(false);
    });

    it('adminLevel이 null이면 false', () => {
      expect(makeAdmin({ adminLevel: null }).isSuperAdmin()).toBe(false);
    });
  });

  describe('isSubAdmin', () => {
    it('adminLevel이 SUB이면 true', () => {
      expect(makeAdmin({ adminLevel: 'SUB' }).isSubAdmin()).toBe(true);
    });

    it('adminLevel이 SUPER이면 false', () => {
      expect(makeAdmin({ adminLevel: 'SUPER' }).isSubAdmin()).toBe(false);
    });

    it('adminLevel이 null이면 false', () => {
      expect(makeAdmin({ adminLevel: null }).isSubAdmin()).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('adminLevel이 SUPER이면 true', () => {
      expect(makeAdmin({ adminLevel: 'SUPER' }).isAdmin()).toBe(true);
    });

    it('adminLevel이 SUB이면 true', () => {
      expect(makeAdmin({ adminLevel: 'SUB' }).isAdmin()).toBe(true);
    });

    it('adminLevel이 null이면 false', () => {
      expect(makeAdmin({ adminLevel: null }).isAdmin()).toBe(false);
    });
  });

  describe('canManageAdmin', () => {
    it('대상이 본인이면 false', () => {
      const superAdmin = makeAdmin({ memberId: 1, adminLevel: 'SUPER' });
      const target = makeAdmin({ memberId: 1, adminLevel: 'SUB' });
      expect(superAdmin.canManageAdmin(target)).toBe(false);
    });

    it('요청자가 SUB이고 대상이 다른 회원이면 false', () => {
      const sub = makeAdmin({ memberId: 1, adminLevel: 'SUB' });
      const target = makeAdmin({ memberId: 2, adminLevel: null });
      expect(sub.canManageAdmin(target)).toBe(false);
    });

    it('요청자가 SUPER이고 대상이 다른 회원이면 true', () => {
      const sup = makeAdmin({ memberId: 1, adminLevel: 'SUPER' });
      const target = makeAdmin({ memberId: 2, adminLevel: 'SUB' });
      expect(sup.canManageAdmin(target)).toBe(true);
    });
  });

  describe('getAdminJwtPayload', () => {
    it('memberId와 adminLevel을 adminId·adminRole로 담아 반환한다', () => {
      const entity = makeAdmin({ memberId: 42, adminLevel: 'SUB' });
      expect(entity.getAdminJwtPayload()).toEqual({
        adminId: 42,
        adminRole: 'SUB',
      });
    });
  });
});
