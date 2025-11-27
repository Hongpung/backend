import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminAuthCredentialService } from './admin-auth-credential.service';
import { AdminAuthEntity } from '../domain/admin-auth.entity';

jest.mock('bcrypt');

describe('AdminAuthCredentialService', () => {
  let service: AdminAuthCredentialService;

  const compareMock = bcrypt.compare as jest.MockedFunction<
    (
      data: string | Buffer<ArrayBufferLike>,
      encrypted: string,
    ) => Promise<boolean>
  >;

  beforeEach(() => {
    compareMock.mockClear();
    service = new AdminAuthCredentialService();
  });

  describe('verifyAdminCredentials', () => {
    it('관리자이고 비밀번호가 맞으면 true', async () => {
      const admin = new AdminAuthEntity(
        1,
        'admin@test.com',
        'hashed',
        'SUPER',
        1,
      );
      compareMock.mockResolvedValue(true);

      await expect(
        service.verifyAdminCredentials(admin, 'plain'),
      ).resolves.toBe(true);
    });

    it('entity가 null이면 false', async () => {
      await expect(
        service.verifyAdminCredentials(null, 'plain'),
      ).resolves.toBe(false);
      expect(compareMock).not.toHaveBeenCalled();
    });

    it('비관리자면 false', async () => {
      const member = new AdminAuthEntity(
        2,
        'user@test.com',
        'hashed',
        null,
        null,
      );

      await expect(
        service.verifyAdminCredentials(member, 'plain'),
      ).resolves.toBe(false);
      expect(compareMock).not.toHaveBeenCalled();
    });

    it('비밀번호가 틀리면 false', async () => {
      const admin = new AdminAuthEntity(
        1,
        'admin@test.com',
        'hashed',
        'SUPER',
        1,
      );
      compareMock.mockResolvedValue(false);

      await expect(
        service.verifyAdminCredentials(admin, 'wrong'),
      ).resolves.toBe(false);
    });
  });

  describe('assertAdminLogin', () => {
    it('유효한 관리자면 entity를 반환한다', async () => {
      const admin = new AdminAuthEntity(
        1,
        'admin@test.com',
        'hashed',
        'SUPER',
        1,
      );
      compareMock.mockResolvedValue(true);

      await expect(service.assertAdminLogin(admin, 'plain')).resolves.toBe(
        admin,
      );
    });

    it('entity가 null이면 UnauthorizedException', async () => {
      await expect(
        service.assertAdminLogin(null, 'plain'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('비밀번호가 틀리면 UnauthorizedException', async () => {
      const admin = new AdminAuthEntity(
        1,
        'admin@test.com',
        'hashed',
        'SUPER',
        1,
      );
      compareMock.mockResolvedValue(false);

      await expect(
        service.assertAdminLogin(admin, 'wrong'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('비관리자면 UnauthorizedException', async () => {
      const member = new AdminAuthEntity(
        3,
        'user@test.com',
        'hashed',
        null,
        null,
      );
      compareMock.mockResolvedValue(true);

      await expect(
        service.assertAdminLogin(member, 'plain'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
