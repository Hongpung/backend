import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { PinoLogger } from 'nestjs-pino';

/** HTTP 요청/응답을 구조화된 JSON으로 로깅 (Loki/OTel 확장 대비, traceId 포함) */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string }>();
    const { method, url, ip } = req;
    const userAgent = req.get('user-agent') ?? '';
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = ctx.getResponse();
          const statusCode = res.statusCode;
          const durationMs = Date.now() - now;
          this.logger.info(
            {
              type: 'http_request',
              method,
              url,
              statusCode,
              durationMs,
              ip,
              userAgent,
              traceId: req.id,
            },
            `HTTP ${method} ${url} ${statusCode} ${durationMs}ms`,
          );
        },
        error: (err: { status?: number; message?: string }) => {
          const durationMs = Date.now() - now;
          const statusCode = err?.status ?? 500;
          this.logger.warn(
            {
              type: 'http_request',
              method,
              url,
              statusCode,
              durationMs,
              ip,
              userAgent,
              traceId: req.id,
              errMessage: err?.message,
            },
            `HTTP ${method} ${url} ${statusCode} ${durationMs}ms error`,
          );
        },
      }),
    );
  }
}
