import { Inject, Injectable } from '@nestjs/common';
import { FindAdminEmailsUseCase } from 'src/features/admin-auth/application/ports/in/find-admin-emails.use-case';
import { VerifyAdminPasswordUseCase } from 'src/features/admin-auth/application/ports/in/verify-admin-password.use-case';
import {
  type MemberAuthAdminEmail,
  type MemberAuthAdminLookupPort,
} from '../../../application/ports/out/member-auth-admin-lookup.port';

@Injectable()
export class MemberAuthAdminLookupAdapter implements MemberAuthAdminLookupPort {
  constructor(
    @Inject(VerifyAdminPasswordUseCase)
    private readonly verifyAdminPasswordUseCase: VerifyAdminPasswordUseCase,
    @Inject(FindAdminEmailsUseCase)
    private readonly findAdminEmailsUseCase: FindAdminEmailsUseCase,
  ) {}

  verifyAdminPassword(adminId: number, password: string): Promise<boolean> {
    return this.verifyAdminPasswordUseCase.verify({
      adminId,
      password_for_verification: password,
    });
  }

  findAdminEmails(): Promise<MemberAuthAdminEmail[]> {
    return this.findAdminEmailsUseCase.findAdminEmails();
  }
}
