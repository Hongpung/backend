import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminAuthController } from './infrastructure/in/controllers/admin-auth.controller';
import { AdminAuthService } from './application/admin-auth.service';
import { AdminAuthCredentialService } from './application/admin-auth-credential.service';
import { AdminAuthUseCasePort } from './application/ports/in/admin-auth.use-case.port';
import { AdminAuthRepositoryPort } from './application/ports/out/admin-auth.repository.port';
import { AdminAuthTokenIssuerPort } from './application/ports/out/token-issuer.port';
import { AdminAuthPrismaRepository } from './infrastructure/out/prisma/admin-auth.prisma.repository';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { AdminAuthJwtTokenIssuerAdapter } from './infrastructure/out/jwt/admin-auth-jwt-token-issuer.adapter';
import { VerifyAdminPasswordUseCase } from './application/ports/in/verify-admin-password.use-case';
import { VerifyAdminPasswordService } from './application/use-case/verify-admin-password.use-case';
import { FindAdminEmailsUseCase } from './application/ports/in/find-admin-emails.use-case';
import { FindAdminEmailsService } from './application/use-case/find-admin-emails.use-case';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.SECRET_KEY,
    }),
    PrismaModule,
  ],
  controllers: [AdminAuthController],
  providers: [
    AdminAuthCredentialService,
    AdminAuthService,
    {
      provide: AdminAuthUseCasePort,
      useExisting: AdminAuthService,
    },
    {
      provide: AdminAuthRepositoryPort,
      useClass: AdminAuthPrismaRepository,
    },
    {
      provide: AdminAuthTokenIssuerPort,
      useClass: AdminAuthJwtTokenIssuerAdapter,
    },
    {
      provide: VerifyAdminPasswordUseCase,
      useClass: VerifyAdminPasswordService,
    },
    {
      provide: FindAdminEmailsUseCase,
      useClass: FindAdminEmailsService,
    },
  ],
  exports: [
    AdminAuthService,
    VerifyAdminPasswordUseCase,
    FindAdminEmailsUseCase,
  ],
})
export class AdminAuthModule {}
