import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationService } from './application/notification.service';
import { NotificationDispatchService } from './application/notification-dispatch.service';
import { PushNotificationTokenService } from './application/push-notification-token.service';
import { NotificationController } from './infrastructure/in/controllers/notification.controller';
import { PushNotificationTokenController } from './infrastructure/in/controllers/push-notification-token.controller';
import { PrismaNotificationRepository } from './infrastructure/out/prisma/notification.prisma.repository';
import { PrismaNotificationTokenRepository } from './infrastructure/out/prisma/notification-token.prisma.repository';
import { PushNotificationMemberLookupAdapter } from './infrastructure/out/adapters/push-notification-member-lookup.adapter';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { MemberModule } from 'src/features/member/member.module';
import { NotificationRepositoryPort } from './application/ports/out/notification.repository.port';
import { NotificationTokenRepositoryPort } from './application/ports/out/notification-token.repository.port';
import { PushDeliveryPort } from './application/ports/out/push-delivery.port';
import { NotificationUseCasePort } from './application/ports/in/notification.use-case.port';
import { NotificationDispatchUseCasePort } from './application/ports/in/notification-dispatch.use-case.port';
import { PushNotificationTokenUseCasePort } from './application/ports/in/push-notification-token.use-case.port';
import { PushNotificationMemberLookupPort } from './application/ports/out/push-notification-member-lookup.port';
import { ClearPushNotificationTokenPort } from './application/ports/out/clear-push-notification-token.port';
import { ExpoPushDeliveryAdapter } from './infrastructure/out/expo/expo-push-delivery.adapter';
import { NotificationEventHandler } from './infrastructure/in/event-handlers/notification.event-handler';
import { PushNotificationQueuePort } from './application/ports/out/push-notification-queue.port';
import { PushNotificationQueueAdapter } from './infrastructure/out/queue/push-notification-queue.adapter';
import { PushNotificationProcessor } from './infrastructure/out/queue/push-notification.processor';
import { PUSH_NOTIFICATION_QUEUE_NAME } from './infrastructure/out/queue/push-notification-queue.constants';
import { NotificationCleanupService } from './application/notification-cleanup.service';
import { NotificationCleanupSchedulerService } from './infrastructure/out/schedulers/notification-cleanup.scheduler';

@Module({
  imports: [
    PrismaModule,
    MemberModule,
    BullModule.registerQueue({
      name: PUSH_NOTIFICATION_QUEUE_NAME,
    }),
  ],
  providers: [
    NotificationService,
    NotificationDispatchService,
    NotificationCleanupService,
    NotificationCleanupSchedulerService,
    PushNotificationTokenService,
    NotificationEventHandler,
    PushNotificationProcessor,
    {
      provide: PushNotificationQueuePort,
      useClass: PushNotificationQueueAdapter,
    },
    {
      provide: NotificationUseCasePort,
      useExisting: NotificationService,
    },
    {
      provide: NotificationDispatchUseCasePort,
      useExisting: NotificationDispatchService,
    },
    {
      provide: PushNotificationTokenUseCasePort,
      useExisting: PushNotificationTokenService,
    },
    {
      provide: ClearPushNotificationTokenPort,
      useExisting: PushNotificationTokenService,
    },
    {
      provide: NotificationRepositoryPort,
      useClass: PrismaNotificationRepository,
    },
    {
      provide: NotificationTokenRepositoryPort,
      useClass: PrismaNotificationTokenRepository,
    },
    {
      provide: PushNotificationMemberLookupPort,
      useClass: PushNotificationMemberLookupAdapter,
    },
    {
      provide: PushDeliveryPort,
      useClass: ExpoPushDeliveryAdapter,
    },
    PrismaNotificationRepository,
    PrismaNotificationTokenRepository,
    PushNotificationMemberLookupAdapter,
    ExpoPushDeliveryAdapter,
  ],
  controllers: [NotificationController, PushNotificationTokenController],
  exports: [
    NotificationService,
    ClearPushNotificationTokenPort,
    NotificationTokenRepositoryPort,
  ],
})
export class PushNotificationModule {}
