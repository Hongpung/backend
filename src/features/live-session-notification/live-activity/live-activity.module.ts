import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LiveActivityService } from './application/live-activity.service';
import { LiveActivityController } from './live-activity.controller';
import { ApnsModule } from './providers/apns/apns.module';
import { LiveActivityStatePort } from './application/ports/out/live-activity-state.port';
import { LiveActivityUseCasePort } from './application/ports/in/live-activity.use-case.port';
import { RedisLiveActivityStateAdapter } from './infrastructure/out/redis/live-activity-redis-state.adapter';
import { LiveActivityEventHandler } from './infrastructure/in/live-activity.event-handler';

@Module({
  imports: [ApnsModule, ConfigModule],
  providers: [
    LiveActivityService,
    LiveActivityEventHandler,
    {
      provide: LiveActivityUseCasePort,
      useExisting: LiveActivityService,
    },
    {
      provide: LiveActivityStatePort,
      useClass: RedisLiveActivityStateAdapter,
    },
  ],
  controllers: [LiveActivityController],
  exports: [LiveActivityService],
})
export class LiveActivityModule {}
