import { Module } from '@nestjs/common';
import { SessionLogController } from './session-log.controller';
import { SessionGateway } from './session.gateway';
import { PrismaService } from 'src/prisma.service';
import { SessionOperationsService } from './session-operations.service';
import { CheckInService } from './check-in.service';
import { CheckInController } from './check-in.controller';
import { RoleEnum } from 'src/role/role.enum';
import { SessionLogService } from './session-log.service';
import { BullModule } from '@nestjs/bull';
import { SessionListGateway } from './session-list.gateway';
import { SessionProcessor } from './session.processor';
import { SessionManagerService } from './session-manager.service';
import { NotificationModule } from 'src/notification/notification.module';
import { SessionWsAuthGuard } from 'src/guards/session-ws-auth.guard';
import { SessionOperationController } from './session-operations.controller';
import { AdminSessionLogController } from './admin-session-log.controller';
import { AdminSessionLogService } from './admin-session-log.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'session',
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    NotificationModule,
  ],
  providers: [
    SessionGateway,
    SessionListGateway,
    PrismaService,
    SessionOperationsService,
    CheckInService,
    RoleEnum,
    SessionLogService,
    SessionProcessor,
    SessionManagerService,
    SessionWsAuthGuard,
    AdminSessionLogService
  ],
  controllers: [SessionLogController, CheckInController, SessionOperationController, AdminSessionLogController],
  exports: [SessionManagerService]
})
export class SessionModule { }
