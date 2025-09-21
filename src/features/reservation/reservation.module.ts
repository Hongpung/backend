import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { MemberModule } from 'src/features/member/member.module';
import { AdminModule } from 'src/features/admin/admin.module';
import { InstrumentModule } from 'src/features/instrument/instrument.module';
import { EventModule } from 'src/infrastructure/events/event.module';
import { DiscardedReservationModule } from 'src/features/discarded-reservation/discarded-reservation.module';
import { FirebaseModule } from 'src/infrastructure/firebase/firebase.module';
import { ReservationProcessor } from './infrastructure/in/queue/reservation.processor';
import { ReservationQueueUpcomingNotificationInHandler } from './infrastructure/in/queue/reservation-queue-upcoming-notification.in-handler';
import { ReservationSchedulerService } from './infrastructure/out/schedulers/reservation-scheduler.service';
import { ReservationRemindNotificationService } from './application/services/reservation-remind-notification.service';
import { ReservationUpcomingNotificationService } from './application/services/reservation-upcoming-notification.service';
import { ReservationSchedulerReadPort } from './application/ports/out/reservation-scheduler-read.port';
import { ReservationSchedulerReadAdapter } from './infrastructure/out/adapters/reservation-scheduler-read.adapter';
import { PrismaReservationRepository } from './infrastructure/out/prisma/reservation.repository.impl';
import { ReservationRepositoryPort } from './application/ports/out/reservation.repository.port';
import { CreateReservationHandler } from './application/user/commands/handlers/create-reservation.handler';
import { UpdateReservationHandler } from './application/user/commands/handlers/update-reservation.handler';
import { LeaveReservationHandler } from './application/user/commands/handlers/leave-reservation.handler';
import { DeleteReservationHandler } from './application/user/commands/handlers/delete-reservation.handler';
import { GetTodayReservationsHandler } from './application/user/queries/handlers/get-today-reservations.handler';
import { GetUserNextReservationsHandler } from './application/user/queries/handlers/get-user-next-reservations.handler';
import { GetReservationsByTermHandler } from './application/user/queries/handlers/get-reservations-by-term.handler';
import { GetReservationsByMonthHandler } from './application/user/queries/handlers/get-reservations-by-month.handler';
import { GetReservationsByDateHandler } from './application/user/queries/handlers/get-reservations-by-date.handler';
import { GetOccupiedTimesHandler } from './application/user/queries/handlers/get-occupied-times.handler';
import { GetReservationDetailHandler } from './application/user/queries/handlers/get-reservation-detail.handler';
import { AdminForceCreateReservationHandler } from './application/admin/commands/handlers/admin-force-create-reservation.handler';
import { AdminForceDeleteReservationHandler } from './application/admin/commands/handlers/admin-force-delete-reservation.handler';
import { AdminModifyReservationHandler } from './application/admin/commands/handlers/admin-modify-reservation.handler';
import { AdminBatchCreateReservationHandler } from './application/admin/commands/handlers/admin-batch-create-reservation.handler';
import { ReservationUserCommandUseCase } from './application/user/services/reservation-user-command.use-case';
import { ReservationUserQueryUseCase } from './application/user/services/reservation-user-query.use-case';
import { ReservationAdminService } from './application/admin/services/reservation-admin.service';
import { ReservationUserCommandUseCasePort } from './application/ports/in/reservation-user-command.use-case.port';
import { ReservationUserQueryUseCasePort } from './application/ports/in/reservation-user-query.use-case.port';
import { ReservationAdminCommandUseCasePort } from './application/ports/in/reservation-admin-command.use-case.port';
import { CreateReservationPolicyService } from './application/user/services/create-reservation-policy.service';
import { CreateReservationResourceLoaderService } from './application/user/services/create-reservation-resource-loader.service';
import { ReservationCreatedEventPublisherService } from './application/user/services/reservation-created-event-publisher.service';
import { ReservationEventPublisherPort } from './application/ports/out/reservation-event-publisher.port';
import { ReservationPushNotificationPublisherAdapter } from './infrastructure/out/messaging/reservation-push-notification.publisher.adapter';
import { ReservationMemberLookupPort } from './application/ports/out/reservation-member-lookup.port';
import { ReservationMemberLookupAdapter } from './infrastructure/out/adapters/reservation-member-lookup.adapter';
import { ReservationAdminLookupPort } from './application/ports/out/reservation-admin-lookup.port';
import { ReservationAdminLookupAdapter } from './infrastructure/out/adapters/reservation-admin-lookup.adapter';
import { ReservationInstrumentLookupPort } from './application/ports/out/reservation-instrument-lookup.port';
import { ReservationInstrumentLookupAdapter } from './infrastructure/out/adapters/reservation-instrument-lookup.adapter';
import { ReservationUserCommandController } from './infrastructure/in/controllers/reservation-user-command.controller';
import { ReservationUserQueryController } from './infrastructure/in/controllers/reservation-user-query.controller';
import { ResponseValidationInterceptor } from 'src/common/validation/response-validation.interceptor';

@Module({
  imports: [
    CqrsModule,
    PrismaModule,
    FirebaseModule,
    BullModule.registerQueue({
      name: 'reservation',
    }),
    EventModule,
    DiscardedReservationModule,
    MemberModule,
    AdminModule,
    InstrumentModule,
  ],
  providers: [
    ReservationUserCommandUseCase,
    {
      provide: ReservationUserCommandUseCasePort,
      useExisting: ReservationUserCommandUseCase,
    },
    ReservationUserQueryUseCase,
    {
      provide: ReservationUserQueryUseCasePort,
      useExisting: ReservationUserQueryUseCase,
    },
    ReservationAdminService,
    {
      provide: ReservationAdminCommandUseCasePort,
      useExisting: ReservationAdminService,
    },
    CreateReservationPolicyService,
    CreateReservationResourceLoaderService,
    ReservationCreatedEventPublisherService,
    {
      provide: ReservationEventPublisherPort,
      useClass: ReservationPushNotificationPublisherAdapter,
    },
    ReservationPushNotificationPublisherAdapter,
    {
      provide: ReservationMemberLookupPort,
      useClass: ReservationMemberLookupAdapter,
    },
    {
      provide: ReservationAdminLookupPort,
      useClass: ReservationAdminLookupAdapter,
    },
    {
      provide: ReservationInstrumentLookupPort,
      useClass: ReservationInstrumentLookupAdapter,
    },
    ReservationSchedulerService,
    ReservationRemindNotificationService,
    ReservationUpcomingNotificationService,
    ReservationQueueUpcomingNotificationInHandler,
    {
      provide: ReservationSchedulerReadPort,
      useClass: ReservationSchedulerReadAdapter,
    },
    ReservationProcessor,
    {
      provide: ReservationRepositoryPort,
      useClass: PrismaReservationRepository,
    },
    CreateReservationHandler,
    UpdateReservationHandler,
    LeaveReservationHandler,
    DeleteReservationHandler,
    GetTodayReservationsHandler,
    GetUserNextReservationsHandler,
    GetReservationsByTermHandler,
    GetReservationsByMonthHandler,
    GetReservationsByDateHandler,
    GetOccupiedTimesHandler,
    GetReservationDetailHandler,
    AdminForceCreateReservationHandler,
    AdminForceDeleteReservationHandler,
    AdminModifyReservationHandler,
    AdminBatchCreateReservationHandler,
    ResponseValidationInterceptor,
  ],
  controllers: [
    ReservationUserCommandController,
    ReservationUserQueryController,
  ],
  exports: [
    ReservationRepositoryPort,
    ReservationEventPublisherPort,
    ReservationSchedulerReadPort,
    ReservationUpcomingNotificationService,
  ],
})
export class ReservationModule {}
