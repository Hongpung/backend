import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import {
  RESPONSE_SCHEMA_KEY,
  ResponseSchemaMetadata,
} from './response-schema.decorator';

@Injectable()
export class ResponseValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseValidationInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<ResponseSchemaMetadata>(
      RESPONSE_SCHEMA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return next.handle();
    }

    return next.handle().pipe(
      mergeMap(async (data) => {
        await this.validateResponse(metadata, data, context);
        return data;
      }),
    );
  }

  private async validateResponse(
    metadata: ResponseSchemaMetadata,
    data: unknown,
    context: ExecutionContext,
  ): Promise<void> {
    const values = metadata.isArray
      ? Array.isArray(data)
        ? data
        : []
      : [data];

    if (metadata.isArray && !Array.isArray(data)) {
      this.throwContractError(context, 'Expected array response');
      return;
    }

    for (const value of values) {
      const instance = plainToInstance(metadata.schema, value);
      const errors = await validate(instance as object, {
        whitelist: false,
        forbidNonWhitelisted: false,
        forbidUnknownValues: false,
      });

      if (errors.length > 0) {
        this.throwContractError(
          context,
          errors
            .map((error) => Object.values(error.constraints ?? {}).join(', '))
            .filter(Boolean)
            .join(' | '),
        );
      }
    }
  }

  private throwContractError(
    context: ExecutionContext,
    details: string,
  ): never {
    const request = context.switchToHttp().getRequest<{ url?: string }>();
    this.logger.error(
      `Response contract validation failed (${request?.url ?? 'unknown'}): ${details}`,
    );
    throw new InternalServerErrorException(
      'Response contract validation failed',
    );
  }
}
