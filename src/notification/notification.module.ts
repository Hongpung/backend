import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { PrismaService } from 'src/prisma.service';
import { MemberModule } from 'src/member/member.module';

@Module({
  imports:[MemberModule],
  providers: [NotificationService, PrismaService],
  controllers: [NotificationController],
  exports: [NotificationService]
})
export class NotificationModule { }
