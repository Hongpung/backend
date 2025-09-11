import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SESSION_QUEUE_NAME } from 'src/features/session/infrastructure/out/queue/session-job.interface';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsAuthGuard } from './metrics-auth.guard';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'reservation' },
      { name: SESSION_QUEUE_NAME },
    ),
  ],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    MetricsAuthGuard,
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
  ],
})
export class MetricsModule {}
