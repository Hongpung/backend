import { describe, expect, it } from '@jest/globals';
import { ClubVO } from '../../../../domain/club.vo';
import { AdminPrismaMapper } from './admin.prisma.mapper';

describe('관리자 Prisma 매퍼', () => {
  describe('toDomain', () => {
    const baseRow = {
      memberId: 1,
      email: 'a@test.com',
      name: 'n',
      nickname: null as string | null,
      enrollmentNumber: '1',
      clubId: 10,
      adminLevel: 'SUPER' as const,
    };

    it('club이 있으면 ClubVO로 매핑한다', () => {
      const entity = AdminPrismaMapper.toDomain({
        ...baseRow,
        club: {
          clubId: 10,
          clubName: '테스트동아리',
          profileImageUrl: null,
        },
      });

      expect(entity.club).toBeInstanceOf(ClubVO);
      expect(entity.club?.clubId).toBe(10);
      expect(entity.club?.clubName).toBe('테스트동아리');
    });

    it('club이 null이면 entity.club은 null이다', () => {
      const entity = AdminPrismaMapper.toDomain({
        ...baseRow,
        club: null,
      });

      expect(entity.club).toBeNull();
    });

    it('adminLevel이 null이면 entity에도 null이고 isAdmin은 false', () => {
      const entity = AdminPrismaMapper.toDomain({
        ...baseRow,
        adminLevel: null,
        club: null,
      });

      expect(entity.adminLevel).toBeNull();
      expect(entity.isAdmin()).toBe(false);
    });
  });
});
