import { Inject, Injectable } from '@nestjs/common';
import { VerifyAdminPasswordUseCase } from 'src/features/admin-auth/application/ports/in/verify-admin-password.use-case';
import {
  MemberAdminAuthPort,
  type IMemberAdminAuthPort,
} from '../../../application/ports/out/member-admin-auth.port';

@Injectable()
export class MemberAdminAuthAdapter implements IMemberAdminAuthPort {
  constructor(
    @Inject(VerifyAdminPasswordUseCase)
    private readonly verifyAdminPasswordUseCase: VerifyAdminPasswordUseCase,
  ) {}

  verifyAdminPassword(adminId: number, password: string): Promise<boolean> {
    return this.verifyAdminPasswordUseCase.verify({
      adminId,
      password_for_verification: password,
    });
  }
}
