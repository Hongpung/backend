import { Module } from '@nestjs/common';
import { ExpoService } from './expo.service';
import { LiveNotificationPushPort } from '../../application/ports/out/live-notification-push.port';

@Module({
  providers: [
    ExpoService,
    {
      provide: LiveNotificationPushPort,
      useExisting: ExpoService,
    },
  ],
  exports: [ExpoService, LiveNotificationPushPort],
})
export class ExpoModule {}
