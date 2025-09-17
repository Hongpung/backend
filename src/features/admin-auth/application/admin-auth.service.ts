import {
  Injectable,
  Inject,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminAuthUseCasePort } from './ports/in/admin-auth.use-case.port';
import {
  AdminAuthRepositoryPort,
  type IAdminAuthRepository,
} from './ports/out/admin-auth.repository.port';
import {
  AdminAuthTokenIssuerPort,
  type AdminAuthTokenIssuerPort as IAdminAuthTokenIssuerPort,
} from './ports/out/token-issuer.port';
import { AdminAuthCredentialService } from './admin-auth-credential.service';

@Injectable()
export class AdminAuthService implements AdminAuthUseCasePort {
  constructor(
    @Inject(AdminAuthRepositoryPort)
    private readonly adminAuthRepository: IAdminAuthRepository,
    @Inject(AdminAuthTokenIssuerPort)
    private readonly tokenIssuer: IAdminAuthTokenIssuerPort,
    private readonly credentialService: AdminAuthCredentialService,
  ) {}

  async adminLogin(
    email: string,
    password: string,
  ): Promise<{ token: string }> {
    const adminAuth = await this.adminAuthRepository.findAuthByEmail(email);
    const validAdmin = await this.credentialService.assertAdminLogin(
      adminAuth,
      password,
    );

    const token = await this.tokenIssuer.issueAdminToken(
      validAdmin.toJwtPayload(),
    );

    return { token };
  }

  async adminExtendToken(adminId: number): Promise<{ token: string }> {
    const adminAuth =
      await this.adminAuthRepository.findAdminByMemberId(adminId);
    if (!adminAuth) {
      throw new NotFoundException('Email information is not exist');
    }
    if (!adminAuth.isAdmin()) {
      throw new UnauthorizedException("You're not Admin");
    }

    const token = await this.tokenIssuer.issueAdminToken(
      adminAuth.toJwtPayload(),
    );

    return { token };
  }
}
