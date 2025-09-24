import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LiveNotificationService } from './application/live-notification.service';
import { LiveNotificationController } from './live-notification.controller';
import { ExpoModule } from './providers/expo/expo.module';
import { MemberModule } from 'src/features/member/member.module';
import { LiveNotificationStatePort } from './application/ports/out/live-notification-state.port';
import { LiveNotificationMemberLookupPort } from './application/ports/out/live-notification-member-lookup.port';
import { LiveNotificationUseCasePort } from './application/ports/in/live-notification.use-case.port';
import { RedisLiveNotificationStateAdapter } from './infrastructure/out/redis/live-notification-redis-state.adapter';
import { LiveNotificationMemberLookupAdapter } from './infrastructure/out/adapters/live-notification-member-lookup.adapter';
import { LiveNotificationEventHandler } from './infrastructure/in/live-notification.event-handler';

@Module({
  imports: [ExpoModule, ConfigModule, MemberModule],
  providers: [
    LiveNotificationService,
    LiveNotificationEventHandler,
    {
      provide: LiveNotificationUseCasePort,
      useExisting: LiveNotificationService,
    },
    {
      provide: LiveNotificationStatePort,
      useClass: RedisLiveNotificationStateAdapter,
    },
    {
      provide: LiveNotificationMemberLookupPort,
      useClass: LiveNotificationMemberLookupAdapter,
    },
  ],
  controllers: [LiveNotificationController],
  exports: [LiveNotificationService],
})
export class LiveNotificationModule {}
