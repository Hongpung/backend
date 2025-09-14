import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { ClubMemberController } from './controllers/club-member.controller';
import { ClubAdminController } from './controllers/club-admin.controller';
import { ClubMemberService } from './services/club-member.service';
import { ClubAdminService } from './services/club-admin.service';
import { ClubRepository } from './repositories/club.repository';
import { ClubRepositoryPort } from './repositories/club.repository.port';

@Module({
  imports: [PrismaModule],
  controllers: [ClubMemberController, ClubAdminController],
  providers: [
    ClubMemberService,
    ClubAdminService,
    {
      provide: ClubRepositoryPort,
      useClass: ClubRepository,
    },
  ],
})
export class ClubModule {}
