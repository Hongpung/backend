import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { AdminEntity } from '../../domain/admin.entity';
import type { IAdminRepository } from '../ports/out/admin.repository.port';
import { AdminLevelLookupService } from './admin-level-lookup.use-case';

function adminFixture(
  memberId: number,
  adminLevel: 'SUPER' | 'SUB' | null,
  name = '관리자',
): AdminEntity {
  return AdminEntity.create({
    memberId,
    email: `${memberId}@test.com`,
    name,
    nickname: null,
    enrollmentNumber: String(memberId),
    clubId: null,
    club: null,
    adminLevel,
  });
}

describe('AdminLevelLookupService', () => {
  let service: AdminLevelLookupService;
  let adminRepository: jest.Mocked<IAdminRepository>;

  beforeEach(() => {
    adminRepository = {
      findAllAdmins: jest.fn(),
      findAdminLevel: jest.fn(),
      findAdminByMemberId: jest.fn(),
      createAdminLevel: jest.fn(),
      updateAdminLevel: jest.fn(),
      deleteAdminLevel: jest.fn(),
    } as unknown as jest.Mocked<IAdminRepository>;

    service = new AdminLevelLookupService(adminRepository);
  });

  describe('assertIsAdmin', () => {
    it('SUPER 관리자면 통과한다', async () => {
      adminRepository.findAdminLevel.mockResolvedValue(adminFixture(1, 'SUPER'));

      await expect(service.assertIsAdmin(1)).resolves.toBeUndefined();
      expect(adminRepository.findAdminLevel).toHaveBeenCalledWith(1);
    });

    it('SUB 관리자면 통과한다', async () => {
      adminRepository.findAdminLevel.mockResolvedValue(adminFixture(2, 'SUB'));

      await expect(service.assertIsAdmin(2)).resolves.toBeUndefined();
    });

    it('adminLevel이 null이면 UnauthorizedException', async () => {
      adminRepository.findAdminLevel.mockResolvedValue(adminFixture(3, null));

      await expect(service.assertIsAdmin(3)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('회원이 없으면 UnauthorizedException', async () => {
      adminRepository.findAdminLevel.mockResolvedValue(null);

      await expect(service.assertIsAdmin(999)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('assertIsSuperAdmin', () => {
    it('SUPER 관리자면 name을 반환한다', async () => {
      adminRepository.findAdminLevel.mockResolvedValue(
        adminFixture(1, 'SUPER', '슈퍼관리자'),
      );

      await expect(service.assertIsSuperAdmin(1)).resolves.toEqual({
        name: '슈퍼관리자',
      });
      expect(adminRepository.findAdminLevel).toHaveBeenCalledWith(1);
    });

    it('SUB 관리자면 UnauthorizedException', async () => {
      adminRepository.findAdminLevel.mockResolvedValue(adminFixture(2, 'SUB'));

      await expect(service.assertIsSuperAdmin(2)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('adminLevel이 null이면 UnauthorizedException', async () => {
      adminRepository.findAdminLevel.mockResolvedValue(adminFixture(3, null));

      await expect(service.assertIsSuperAdmin(3)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('회원이 없으면 UnauthorizedException', async () => {
      adminRepository.findAdminLevel.mockResolvedValue(null);

      await expect(service.assertIsSuperAdmin(999)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
