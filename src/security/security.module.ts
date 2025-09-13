import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtTokenVerifierService } from './infrastructure/jwt/jwt-token-verifier.service';
import { UserAccessGuard } from './presentation/guards/user-access.guard';
import { AdminAccessGuard } from './presentation/guards/admin-access.guard';
import { VerifiedTokenGuard } from './presentation/guards/verified-token.guard';
import { SessionListWsAuthGuard } from './presentation/guards/session-list-ws-auth.guard';
import { OrGuard } from './presentation/guards/or.guard';
import { AdminRoleGuard } from './presentation/guards/admin-role.guard';

/**
 * SessionControlWsAuthGuard는 SessionOperationsService에 의존하므로 SessionModule에서 제공.
 */
@Global()
@Module({
  imports: [
    // Member 토큰용 기본 secret. Admin/Verified는 JwtTokenVerifierService에서 각각 ADMIN_SECRET_KEY, VERIFIED_SECRET_KEY로 검증.
    JwtModule.register({
      global: true,
      secret: process.env.SECRET_KEY,
    }),
  ],
  providers: [
    JwtTokenVerifierService,
    UserAccessGuard,
    AdminAccessGuard,
    VerifiedTokenGuard,
    SessionListWsAuthGuard,
    OrGuard,
    AdminRoleGuard,
  ],
  exports: [
    JwtTokenVerifierService,
    UserAccessGuard,
    AdminAccessGuard,
    VerifiedTokenGuard,
    SessionListWsAuthGuard,
    OrGuard,
    AdminRoleGuard,
  ],
})
export class SecurityModule {}
