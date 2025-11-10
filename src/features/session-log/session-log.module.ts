import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { SecurityModule } from 'src/security/security.module';

import { SessionLogQueryUseCasePort } from './application/ports/in/session-log-query.use-case.port';
import { SessionLogQueryService } from './application/session-log-query.service';
import { SessionLogRepositoryPort } from './application/ports/out/session-log.repository.port';
import { SessionLogPrismaRepository } from './infrastructure/out/prisma/session-log.prisma.repository';

import { AdminSessionLogQueryUseCasePort } from './application/ports/in/admin-session-log-query.use-case.port';
import { AdminSessionLogQueryService } from './application/admin-session-log-query.service';

import { SessionLogController } from './infrastructure/in/controllers/session-log.controller';
import { AdminSessionLogController } from './infrastructure/in/controllers/admin-session-log.controller';

import { SessionLogCommandRepositoryPort } from './application/ports/out/session-log-command.repository.port';
import { SessionLogCommandPrismaRepository } from './infrastructure/out/prisma/session-log-command.prisma.repository';
import { SessionLogPersistService } from './application/session-log-persist.service';
import { SessionLogPersistRpcHandler } from './infrastructure/in/rpc/session-log-persist.rpc-handler';
import { SessionLogRollbackService } from './application/session-log-rollback.service';
import { SessionLogRollbackRpcHandler } from './infrastructure/in/rpc/session-log-rollback.rpc-handler';
import { SessionRuntimeMappingCleanupService } from './application/session-runtime-mapping-cleanup.service';
import { SessionRuntimeMappingCleanupScheduler } from './infrastructure/out/schedulers/session-runtime-mapping-cleanup.scheduler';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [SessionLogController, AdminSessionLogController],
  providers: [
    SessionLogQueryService,
    {
      provide: SessionLogQueryUseCasePort,
      useExisting: SessionLogQueryService,
    },
    AdminSessionLogQueryService,
    {
      provide: AdminSessionLogQueryUseCasePort,
      useExisting: AdminSessionLogQueryService,
    },
    {
      provide: SessionLogRepositoryPort,
      useClass: SessionLogPrismaRepository,
    },
    {
      provide: SessionLogCommandRepositoryPort,
      useClass: SessionLogCommandPrismaRepository,
    },
    SessionLogPersistService,
    SessionLogPersistRpcHandler,
    SessionLogRollbackService,
    SessionLogRollbackRpcHandler,
    SessionRuntimeMappingCleanupService,
    SessionRuntimeMappingCleanupScheduler,
  ],
})
export class SessionLogModule {}
