import { Module } from '@nestjs/common';
import { NoticeService } from './notice.service';
import { NoticeController } from './notice.controller';
import { PrismaService } from 'src/prisma.service';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports:[NotificationModule],
  controllers: [NoticeController],
  providers: [NoticeService, PrismaService],
})

export class NoticeModule { }
