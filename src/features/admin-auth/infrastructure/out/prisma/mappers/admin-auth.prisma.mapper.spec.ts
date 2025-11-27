import { describe, expect, it } from '@jest/globals';
import { AdminAuthEntity } from '../../../../domain/admin-auth.entity';
import { AdminAuthPrismaMapper } from './admin-auth.prisma.mapper';

describe('AdminAuthPrismaMapper (Prisma → 도메인)', () => {
  describe('toDomain', () => {
    it('Prisma select 결과를 AdminAuthEntity로 변환한다', () => {
      const row = {
        memberId: 10,
        email: 'admin@test.com',
        password: 'hashed',
        adminLevel: 'SUPER' as const,
        clubId: 3,
      };
      const entity = AdminAuthPrismaMapper.toDomain(row);
      expect(entity).toBeInstanceOf(AdminAuthEntity);
      expect(entity.memberId).toBe(10);
      expect(entity.email).toBe('admin@test.com');
      expect(entity.password).toBe('hashed');
      expect(entity.adminLevel).toBe('SUPER');
      expect(entity.clubId).toBe(3);
    });
  });

  describe('toDomainOrNull', () => {
    it('입력이 null이면 null을 반환한다', () => {
      expect(AdminAuthPrismaMapper.toDomainOrNull(null)).toBeNull();
    });

    it('입력이 있으면 toDomain과 동일한 엔티티를 반환한다', () => {
      const row = {
        memberId: 2,
        email: 'u@test.com',
        password: 'p',
        adminLevel: null,
        clubId: null,
      };
      const entity = AdminAuthPrismaMapper.toDomainOrNull(row);
      expect(entity).toEqual(AdminAuthPrismaMapper.toDomain(row));
    });
  });
});
