import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsAuthGuard } from './metrics-auth.guard';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'reservation' },
      { name: 'session' },
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
