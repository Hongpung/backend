import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FindAdminEmailsUseCase } from 'src/features/admin-auth/application/ports/in/find-admin-emails.use-case';
import { VerifyAdminPasswordUseCase } from 'src/features/admin-auth/application/ports/in/verify-admin-password.use-case';
import { MemberAuthAdminLookupAdapter } from './member-auth-admin-lookup.adapter';

describe('MemberAuthAdminLookupAdapter', () => {
  let verifyAdminPasswordUseCase: jest.Mocked<VerifyAdminPasswordUseCase>;
  let findAdminEmailsUseCase: jest.Mocked<FindAdminEmailsUseCase>;
  let adapter: MemberAuthAdminLookupAdapter;

  beforeEach(() => {
    verifyAdminPasswordUseCase = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<VerifyAdminPasswordUseCase>;
    findAdminEmailsUseCase = {
      findAdminEmails: jest.fn(),
    } as unknown as jest.Mocked<FindAdminEmailsUseCase>;
    adapter = new MemberAuthAdminLookupAdapter(
      verifyAdminPasswordUseCase,
      findAdminEmailsUseCase,
    );
  });

  it('verifyAdminPassword를 VerifyAdminPasswordUseCase에 위임한다', async () => {
    verifyAdminPasswordUseCase.verify.mockResolvedValue(true);

    await expect(adapter.verifyAdminPassword(1, 'secret')).resolves.toBe(true);

    expect(verifyAdminPasswordUseCase.verify).toHaveBeenCalledWith({
      adminId: 1,
      password_for_verification: 'secret',
    });
  });

  it('findAdminEmails를 FindAdminEmailsUseCase에 위임한다', async () => {
    const emails = [{ email: 'admin@test.com' }];
    findAdminEmailsUseCase.findAdminEmails.mockResolvedValue(emails);

    await expect(adapter.findAdminEmails()).resolves.toEqual(emails);

    expect(findAdminEmailsUseCase.findAdminEmails).toHaveBeenCalled();
  });
});
