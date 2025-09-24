import { Module } from '@nestjs/common';
import { LiveNotificationModule } from './live-notification/live-notification.module';
import { LiveActivityModule } from './live-activity/live-activity.module';

/**
 * Live Notification (Expo) + Live Activity (APNs)
 */
@Module({
  imports: [LiveNotificationModule, LiveActivityModule],
  exports: [LiveNotificationModule, LiveActivityModule],
})
export class LiveSessionNotificationModule {}
