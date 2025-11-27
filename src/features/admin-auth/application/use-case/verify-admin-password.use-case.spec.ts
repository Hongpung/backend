import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { VerifyAdminPasswordService } from './verify-admin-password.use-case';
import { AdminAuthCredentialService } from '../admin-auth-credential.service';
import { AdminAuthEntity } from '../../domain/admin-auth.entity';
import type { IAdminAuthRepository } from '../ports/out/admin-auth.repository.port';

describe('VerifyAdminPasswordService', () => {
  let service: VerifyAdminPasswordService;
  let adminAuthRepository: jest.Mocked<IAdminAuthRepository>;
  let credentialService: jest.Mocked<AdminAuthCredentialService>;

  beforeEach(() => {
    adminAuthRepository = {
      findAuthByEmail: jest.fn(),
      findAdminByMemberId: jest.fn(),
      findAdminEmails: jest.fn(),
    };

    credentialService = {
      verifyAdminCredentials: jest.fn(),
      assertAdminLogin: jest.fn(),
    } as unknown as jest.Mocked<AdminAuthCredentialService>;

    service = new VerifyAdminPasswordService(
      adminAuthRepository,
      credentialService,
    );
  });

  it('credential 검증 결과를 반환한다', async () => {
    const admin = new AdminAuthEntity(
      1,
      'admin@test.com',
      'hashed',
      'SUPER',
      1,
    );
    adminAuthRepository.findAdminByMemberId.mockResolvedValue(admin);
    credentialService.verifyAdminCredentials.mockResolvedValue(true);

    await expect(
      service.verify({ adminId: 1, password_for_verification: 'plain' }),
    ).resolves.toBe(true);

    expect(adminAuthRepository.findAdminByMemberId).toHaveBeenCalledWith(1);
    expect(credentialService.verifyAdminCredentials).toHaveBeenCalledWith(
      admin,
      'plain',
    );
  });

  it('멤버가 없으면 credential 서비스에 null을 전달한다', async () => {
    adminAuthRepository.findAdminByMemberId.mockResolvedValue(null);
    credentialService.verifyAdminCredentials.mockResolvedValue(false);

    await expect(
      service.verify({ adminId: 999, password_for_verification: 'plain' }),
    ).resolves.toBe(false);

    expect(credentialService.verifyAdminCredentials).toHaveBeenCalledWith(
      null,
      'plain',
    );
  });
});
