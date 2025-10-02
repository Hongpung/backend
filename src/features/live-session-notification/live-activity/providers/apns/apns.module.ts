import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApnsService } from './apns.service';
import { LiveActivityPushPort } from '../../application/ports/out/live-activity-push.port';

@Module({
  imports: [ConfigModule],
  providers: [
    ApnsService,
    {
      provide: LiveActivityPushPort,
      useExisting: ApnsService,
    },
  ],
  exports: [ApnsService, LiveActivityPushPort],
})
export class ApnsModule {}
