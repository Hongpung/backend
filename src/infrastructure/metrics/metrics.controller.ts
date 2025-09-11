import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsAuthGuard } from './metrics-auth.guard';

@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  @UseGuards(MetricsAuthGuard)
  @Header('Content-Type', 'text/plain; charset=utf-8; version=0.0.4')
  async metrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
