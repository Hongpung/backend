import { Module } from '@nestjs/common';
import { OnairSessionGateway } from './infrastructure/in/gateways/onair-session.gateway';
import { SessionOperationsService } from './application/services/session-operations.service';
import { CheckInService } from './application/services/check-in.service';
import { CheckInController } from './infrastructure/in/controllers/check-in.controller';
import { RoleEnum } from 'src/role/role.enum';
import { BullModule } from '@nestjs/bullmq';
import { SessionListGateway } from './infrastructure/in/gateways/session-list.gateway';
import { SessionProcessor } from './infrastructure/out/queue/session.processor';
import { SESSION_QUEUE_NAME } from './infrastructure/out/queue/session-job.interface';
import { SessionRuntimeManager } from './application/runtime/session-runtime.manager';
import { SessionDomainService } from './domain/runtime/session-domain.service';
import { SecurityModule } from 'src/security/security.module';
import { SessionControlWsAuthGuard } from 'src/security/presentation/guards/session-control-ws-auth.guard';
import { SessionOperationController } from './infrastructure/in/controllers/session-operations.controller';
import { PrismaSessionRepository } from './infrastructure/out/persistence/session.repository.impl';
import { SessionRepositoryPort } from './application/ports/out/session.repository.port';
import { SessionJobAdapter } from './infrastructure/out/queue/session-job.adapter';
import { SESSION_JOB_PORT } from './application/ports/out/session-job.port';
import { SessionRuntimeSubscriber } from './infrastructure/in/event-handlers/session-runtime.subscriber';
import { SessionRuntimeBootstrap } from './infrastructure/in/bootstrap/session-runtime.bootstrap';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { EventModule } from 'src/infrastructure/events/event.module';
import { CheckInUseCasePort } from './application/ports/in/check-in.use-case.port';
import { SessionOperationsUseCasePort } from './application/ports/in/session-operations.use-case.port';
import { SessionEventPublisherPort } from './application/ports/out/session-event-publisher.port';
import { SessionEventPublisherAdapter } from './infrastructure/out/events/session-event.publisher.adapter';
import { SessionSnapshotStorePort } from './application/ports/out/session-snapshot-store.port';
import { FirestoreSessionSnapshotAdapter } from './infrastructure/out/snapshot/firestore-session-snapshot.adapter';
import { SessionRuntimePort } from './application/ports/out/session-runtime.port';
import { SessionMessagingService } from './application/services/session-messaging.service';
import { SessionDailyReservationsSyncService } from './application/services/session-daily-reservations-sync.service';
import { SessionDailyReservationsSyncQueuePort } from './application/ports/out/session-daily-reservations-sync-queue.port';
import { SessionDailyReservationsSyncQueueAdapter } from './infrastructure/out/queue/session-daily-reservations-sync-queue.adapter';
import { SessionDailyReservationReadPort } from './application/ports/out/session-daily-reservation-read.port';
import { SessionDailyReservationReadAdapter } from './infrastructure/out/adapters/session-daily-reservation-read.adapter';
import { SessionPushNotificationPort } from './application/ports/out/session-push-notification.port';
import { SessionPushNotificationPublisherAdapter } from './infrastructure/out/messaging/session-push-notification.publisher.adapter';
import { SessionDiscardedReservationWritePort } from './application/ports/out/session-discarded-reservation-write.port';
import { SessionDiscardedReservationWriteAdapter } from './infrastructure/out/adapters/session-discarded-reservation-write.adapter';
import { DiscardedReservationModule } from 'src/features/discarded-reservation/discarded-reservation.module';
import { ReservationModule } from 'src/features/reservation/reservation.module';
import { SessionSchedulerService } from './infrastructure/in/schedulers/session-scheduler.service';
import { SessionReservationTimedJobsService } from './application/services/session-reservation-timed-jobs.service';
import { SessionReservationRemindPort } from './application/ports/out/session-reservation-remind.port';
import { SessionReservationRemindAdapter } from './infrastructure/out/adapters/session-reservation-remind.adapter';
import { SessionReservationStartRemindQueuePort } from './application/ports/out/session-reservation-start-remind-queue.port';
import { SessionReservationStartRemindQueueAdapter } from './infrastructure/out/queue/session-reservation-start-remind-queue.adapter';
import { EndSessionRecordPort } from './application/ports/out/end-session-record.port';
import { EndSessionRecordRpcClient } from './infrastructure/out/rpc/end-session-record.rpc-client';
import { EndSessionSnapshotPort } from './application/ports/out/end-session-snapshot.port';
import { EndSessionSnapshotAdapter } from './infrastructure/out/events/end-session-snapshot.adapter';
@Module({
  imports: [
    PrismaModule,
    DiscardedReservationModule,
    ReservationModule,
    EventModule,
    BullModule.registerQueue({
      name: SESSION_QUEUE_NAME,
    }),
    SecurityModule,
  ],
  providers: [
    OnairSessionGateway,
    SessionListGateway,
    SessionOperationsService,
    {
      provide: SessionOperationsUseCasePort,
      useExisting: SessionOperationsService,
    },
    CheckInService,
    {
      provide: CheckInUseCasePort,
      useExisting: CheckInService,
    },
    RoleEnum,
    SessionProcessor,
    SessionMessagingService,
    {
      provide: SessionPushNotificationPort,
      useClass: SessionPushNotificationPublisherAdapter,
    },
    {
      provide: SessionDomainService,
      useFactory: () => new SessionDomainService(),
    },
    SessionRuntimeManager,
    {
      provide: SessionRuntimePort,
      useExisting: SessionRuntimeManager,
    },
    SessionRuntimeSubscriber,
    SessionDailyReservationsSyncService,
    SessionReservationTimedJobsService,
    SessionSchedulerService,
    SessionRuntimeBootstrap,
    {
      provide: SessionDailyReservationReadPort,
      useClass: SessionDailyReservationReadAdapter,
    },
    {
      provide: SessionDailyReservationsSyncQueuePort,
      useClass: SessionDailyReservationsSyncQueueAdapter,
    },
    {
      provide: SessionDiscardedReservationWritePort,
      useClass: SessionDiscardedReservationWriteAdapter,
    },
    {
      provide: SessionReservationStartRemindQueuePort,
      useClass: SessionReservationStartRemindQueueAdapter,
    },
    {
      provide: SessionReservationRemindPort,
      useClass: SessionReservationRemindAdapter,
    },
    {
      provide: SESSION_JOB_PORT,
      useClass: SessionJobAdapter,
    },
    {
      provide: SessionSnapshotStorePort,
      useClass: FirestoreSessionSnapshotAdapter,
    },
    {
      provide: SessionEventPublisherPort,
      useClass: SessionEventPublisherAdapter,
    },
    SessionControlWsAuthGuard,
    {
      provide: SessionRepositoryPort,
      useClass: PrismaSessionRepository,
    },
    {
      provide: EndSessionRecordPort,
      useClass: EndSessionRecordRpcClient,
    },
    {
      provide: EndSessionSnapshotPort,
      useClass: EndSessionSnapshotAdapter,
    },
  ],
  controllers: [CheckInController, SessionOperationController],
  exports: [SessionRuntimeManager, SessionRuntimeBootstrap],
})
export class SessionModule {}
