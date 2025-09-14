import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { EventModule } from 'src/infrastructure/events/event.module';
import { NoticeMemberController } from './controllers/notice-member.controller';
import { NoticeAdminController } from './controllers/notice-admin.controller';
import { NoticeMemberService } from './services/notice-member.service';
import { NoticeAdminService } from './services/notice-admin.service';
import { NoticeRepository } from './repositories/notice.repository';
import { NoticeRepositoryPort } from './repositories/notice.repository.port';

@Module({
  imports: [PrismaModule, EventModule],
  controllers: [NoticeMemberController, NoticeAdminController],
  providers: [
    NoticeMemberService,
    NoticeAdminService,
    {
      provide: NoticeRepositoryPort,
      useClass: NoticeRepository,
    },
  ],
})
export class NoticeModule {}
