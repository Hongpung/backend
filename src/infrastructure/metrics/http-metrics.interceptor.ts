import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { MetricsService } from './metrics.service';

/** HTTP 요청 지연(Histogram) 및 5xx 에러 카운트(Counter) 수집 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const method = req.method;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = ctx.getResponse();
          const statusCode = res.statusCode;
          this.metrics.recordHttpRequest({
            durationMs: Date.now() - now,
            method,
            statusCode,
          });
        },
        error: (err: { status?: number }) => {
          const statusCode = err?.status ?? 500;
          this.metrics.recordHttpRequest({
            durationMs: Date.now() - now,
            method,
            statusCode,
          });
        },
      }),
    );
  }
}
