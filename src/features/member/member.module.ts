import { Module } from '@nestjs/common';
import { MemberController } from './infrastructure/in/controllers/member.controller';
import { MemberAdminController } from './infrastructure/in/controllers/member-admin.controller';
import { MemberPrismaRepository } from './infrastructure/out/prisma/member.prisma.repository';
import { MemberProfileService } from './application/member-profile.service';
import { MemberRoleService } from './application/member-role.service';
import { MemberSearchService } from './application/member-search.service';
import { MemberRepositoryPort } from './application/ports/out/member.repository.port';
import { MemberAuthorizationPort } from './application/ports/out/member-authorization.port';
import { MemberAuthorizationAdapter } from './infrastructure/out/adapters/member-authorization.adapter';
import { MemberAdminAuthPort } from './application/ports/out/member-admin-auth.port';
import { MemberAdminAuthAdapter } from './infrastructure/out/adapters/member-admin-auth.adapter';
import { MemberProfileUseCasePort } from './application/ports/in/member-profile.use-case.port';
import { MemberRoleUseCasePort } from './application/ports/in/member-role.use-case.port';
import { MemberSearchUseCasePort } from './application/ports/in/member-search.use-case.port';
import { MemberLookupUseCase } from './application/ports/in/member-lookup.use-case';
import { MemberLookupService } from './application/use-case/member-lookup.use-case';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { AdminAuthModule } from 'src/features/admin-auth/admin-auth.module';

@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [MemberController, MemberAdminController],
  providers: [
    MemberProfileService,
    MemberRoleService,
    MemberSearchService,
    {
      provide: MemberRepositoryPort,
      useClass: MemberPrismaRepository,
    },
    {
      provide: MemberProfileUseCasePort,
      useExisting: MemberProfileService,
    },
    {
      provide: MemberRoleUseCasePort,
      useExisting: MemberRoleService,
    },
    {
      provide: MemberSearchUseCasePort,
      useExisting: MemberSearchService,
    },
    {
      provide: MemberAuthorizationPort,
      useClass: MemberAuthorizationAdapter,
    },
    {
      provide: MemberAdminAuthPort,
      useClass: MemberAdminAuthAdapter,
    },
    {
      provide: MemberLookupUseCase,
      useClass: MemberLookupService,
    },
  ],
  exports: [MemberLookupUseCase, MemberAuthorizationPort],
})
export class MemberModule {}
