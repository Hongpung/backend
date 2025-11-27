import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FindAdminEmailsService } from './find-admin-emails.use-case';
import type { IAdminAuthRepository } from '../ports/out/admin-auth.repository.port';

describe('FindAdminEmailsService', () => {
  let service: FindAdminEmailsService;
  let adminAuthRepository: jest.Mocked<IAdminAuthRepository>;

  beforeEach(() => {
    adminAuthRepository = {
      findAuthByEmail: jest.fn(),
      findAdminByMemberId: jest.fn(),
      findAdminEmails: jest.fn(),
    };

    service = new FindAdminEmailsService(adminAuthRepository);
  });

  it('repository.findAdminEmails 결과를 그대로 반환한다', async () => {
    const emails = [{ email: 'a1@test.com' }, { email: 'a2@test.com' }];
    adminAuthRepository.findAdminEmails.mockResolvedValue(emails);

    await expect(service.findAdminEmails()).resolves.toEqual(emails);
    expect(adminAuthRepository.findAdminEmails).toHaveBeenCalled();
  });
});
