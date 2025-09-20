import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MemberAuthController } from './infrastructure/in/controllers/member-auth.controller';
import { MemberAuthAdminController } from './infrastructure/in/controllers/member-auth-admin.controller';
import { MemberAuthVerificationController } from './infrastructure/in/controllers/member-auth-verification.controller';
import { MemberAuthService } from './application/member-auth.service';
import { MemberAuthAdminService } from './application/member-auth-admin.service';
import { MemberAuthSignupSchedulerService } from './application/member-auth-signup-scheduler.service';
import { MemberAuthVerificationService } from './application/member-auth-verification.service';
import { MemberAuthUseCasePort } from './application/ports/in/member-auth.use-case.port';
import { MemberAuthAdminUseCasePort } from './application/ports/in/member-auth-admin.use-case.port';
import { MemberAuthVerificationUseCasePort } from './application/ports/in/member-auth-verification.use-case.port';
import { MemberAuthRepositoryPort } from './application/ports/out/member-auth.repository.port';
import { MemberAuthSessionRepositoryPort } from './application/ports/out/member-auth-session.repository.port';
import { MemberAuthDomainEventsPublisherPort } from './application/ports/out/member-auth-domain-events.publisher.port';
import { MemberAuthClearPushTokenPort } from './application/ports/out/member-auth-clear-push-token.port';
import { VerificationCachePort } from './application/ports/out/verification-cache.port';
import { MemberAuthMailSenderPort } from './application/ports/out/mail-sender.port';
import { MemberAuthAdminLookupPort } from './application/ports/out/member-auth-admin-lookup.port';
import { VerificationTokenIssuerPort } from './application/ports/out/verification-token-issuer.port';
import { MemberAuthPrismaRepository } from './infrastructure/out/prisma/member-auth.prisma.repository';
import { MemberAuthSessionPrismaRepository } from './infrastructure/out/prisma/member-auth-session.prisma.repository';
import { MemberAuthDomainEventsPublisherAdapter } from './infrastructure/out/messaging/member-auth-domain-events.publisher.adapter';
import { MemberAuthClearPushTokenAdapter } from './infrastructure/out/push-notification/member-auth-clear-push-token.adapter';
import { VerificationCacheAdapter } from './infrastructure/out/cache/verification-cache.adapter';
import { MemberAuthEventHandler } from './infrastructure/in/event-handlers/member-auth.event-handler';
import { MemberAuthRefreshTokenCleanupSchedulerService } from './infrastructure/out/schedulers/member-auth-refresh-token-cleanup.scheduler';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { AdminAuthModule } from 'src/features/admin-auth/admin-auth.module';
import { MailModule } from 'src/infrastructure/mail/mail.module';
import { EventModule } from 'src/infrastructure/events/event.module';
import { PushNotificationModule } from 'src/features/push-notification/push-notification.module';
import { MemberAuthMailAdapter } from './infrastructure/out/mail/member-auth-mail.adapter';
import { MemberAuthAdminLookupAdapter } from './infrastructure/out/adapters/member-auth-admin-lookup.adapter';
import { VerificationTokenIssuerAdapter } from './infrastructure/out/jwt/verification-token-issuer.adapter';
import { getRefreshTokenHashSecret } from './infrastructure/out/secrets/get-refresh-token-hash-secret';
import { MemberAuthRefreshTokenHashSecretToken } from './application/tokens/member-auth-refresh-token-hash-secret.token';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.SECRET_KEY,
    }),
    PrismaModule,
    AdminAuthModule,
    MailModule,
    EventModule,
    PushNotificationModule,
  ],
  controllers: [
    MemberAuthController,
    MemberAuthAdminController,
    MemberAuthVerificationController,
  ],
  providers: [
    MemberAuthService,
    MemberAuthAdminService,
    MemberAuthSignupSchedulerService,
    MemberAuthVerificationService,
    MemberAuthEventHandler,
    MemberAuthRefreshTokenCleanupSchedulerService,
    {
      provide: MemberAuthUseCasePort,
      useExisting: MemberAuthService,
    },
    {
      provide: MemberAuthAdminUseCasePort,
      useExisting: MemberAuthAdminService,
    },
    {
      provide: MemberAuthVerificationUseCasePort,
      useExisting: MemberAuthVerificationService,
    },
    {
      provide: MemberAuthRepositoryPort,
      useClass: MemberAuthPrismaRepository,
    },
    {
      provide: MemberAuthSessionRepositoryPort,
      useClass: MemberAuthSessionPrismaRepository,
    },
    {
      provide: MemberAuthDomainEventsPublisherPort,
      useClass: MemberAuthDomainEventsPublisherAdapter,
    },
    {
      provide: MemberAuthClearPushTokenPort,
      useClass: MemberAuthClearPushTokenAdapter,
    },
    {
      provide: VerificationCachePort,
      useClass: VerificationCacheAdapter,
    },
    {
      provide: MemberAuthMailSenderPort,
      useClass: MemberAuthMailAdapter,
    },
    {
      provide: MemberAuthAdminLookupPort,
      useClass: MemberAuthAdminLookupAdapter,
    },
    {
      provide: VerificationTokenIssuerPort,
      useClass: VerificationTokenIssuerAdapter,
    },
    {
      provide: MemberAuthRefreshTokenHashSecretToken,
      useFactory: () => getRefreshTokenHashSecret(),
    },
  ],
  exports: [MemberAuthService],
})
export class MemberAuthModule implements OnModuleInit {
  onModuleInit(): void {
    getRefreshTokenHashSecret();
  }
}
