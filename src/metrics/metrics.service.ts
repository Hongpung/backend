import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  Registry,
  collectDefaultMetrics,
  Gauge,
  Counter,
  Histogram,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new Registry();

  /** Event loop lag (초 단위). setTimeout(0) 실행 지연으로 근사 */
  private readonly eventLoopLagGauge: Gauge<string>;

  /** Bull 큐별 job 수 (state: waiting, active, completed, failed, delayed) */
  private readonly bullQueueJobsGauge: Gauge<string>;

  /** HTTP 요청 지연 (초). Grafana 지연 분포/백분위수용 */
  private readonly httpRequestDuration: Histogram<string>;

  /** HTTP 에러 요청 수 (5xx). 알림/에러율용 */
  private readonly httpRequestsErrorsTotal: Counter<string>;

  constructor(
    @InjectQueue('reservation') private readonly reservationQueue: Queue,
    @InjectQueue('session') private readonly sessionQueue: Queue,
  ) {
    this.registry.setDefaultLabels({ app: 'hongpung-server' });

    this.eventLoopLagGauge = new Gauge({
      name: 'nodejs_event_loop_lag_seconds',
      help: 'Approximate event loop lag in seconds (setTimeout(0) delay)',
      registers: [this.registry],
    });

    this.bullQueueJobsGauge = new Gauge({
      name: 'bull_queue_jobs_total',
      help: 'Number of jobs in Bull queue by state',
      labelNames: ['queue', 'state'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.httpRequestsErrorsTotal = new Counter({
      name: 'http_requests_errors_total',
      help: 'Total number of HTTP requests that resulted in server error (5xx)',
      labelNames: ['method'],
      registers: [this.registry],
    });
  }

  /** HTTP 요청 완료 시 호출 (지연 기록 + 5xx 시 에러 카운트) */
  recordHttpRequest(params: {
    durationMs: number;
    method: string;
    statusCode: number;
  }): void {
    const { durationMs, method, statusCode } = params;
    const status = String(statusCode);
    this.httpRequestDuration.observe({ method, status_code: status }, durationMs / 1000);
    if (statusCode >= 500) {
      this.httpRequestsErrorsTotal.inc({ method });
    }
  }

  async onModuleInit() {
    collectDefaultMetrics({
      register: this.registry,
      eventLoopMonitoringPrecision: 10,
      prefix: 'nodejs_',
    });

    this.startEventLoopLagMeasurement();
    this.startBullQueueMetrics();
  }

  private startEventLoopLagMeasurement() {
    const measure = () => {
      const start = Date.now();
      setImmediate(() => {
        const lagMs = Date.now() - start;
        this.eventLoopLagGauge.set(lagMs / 1000);
      });
    };
    setInterval(measure, 1000);
    measure();
  }

  private startBullQueueMetrics() {
    const update = async () => {
      for (const queue of [this.reservationQueue, this.sessionQueue]) {
        const name = queue.name;
        try {
          const counts = await queue.getJobCounts();
          this.bullQueueJobsGauge.set(
            { queue: name, state: 'waiting' },
            counts.waiting,
          );
          this.bullQueueJobsGauge.set(
            { queue: name, state: 'active' },
            counts.active,
          );
          this.bullQueueJobsGauge.set(
            { queue: name, state: 'completed' },
            counts.completed,
          );
          this.bullQueueJobsGauge.set(
            { queue: name, state: 'failed' },
            counts.failed,
          );
          this.bullQueueJobsGauge.set(
            { queue: name, state: 'delayed' },
            counts.delayed,
          );
        } catch {
          // Redis 연결 실패 시 스킵
        }
      }
    };
    setInterval(update, 5000);
    update();
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
