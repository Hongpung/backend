import { Inject, Injectable } from '@nestjs/common';
import {
  IAdminAuthRepository,
  AdminAuthRepositoryPort,
} from '../ports/out/admin-auth.repository.port';
import { VerifyAdminPasswordDto } from '../ports/in/dto/verify-admin-password.dto';
import { VerifyAdminPasswordUseCase } from '../ports/in/verify-admin-password.use-case';
import { AdminAuthCredentialService } from '../admin-auth-credential.service';

@Injectable()
export class VerifyAdminPasswordService implements VerifyAdminPasswordUseCase {
  constructor(
    @Inject(AdminAuthRepositoryPort)
    private readonly adminAuthRepository: IAdminAuthRepository,
    private readonly credentialService: AdminAuthCredentialService,
  ) {}

  async verify(dto: VerifyAdminPasswordDto): Promise<boolean> {
    const admin = await this.adminAuthRepository.findAdminByMemberId(
      dto.adminId,
    );
    return this.credentialService.verifyAdminCredentials(
      admin,
      dto.password_for_verification,
    );
  }
}
