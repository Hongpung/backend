import { afterEach, describe, expect, it } from '@jest/globals';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { MetricsAuthGuard } from './metrics-auth.guard';

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: <T = string>(key: string) => values[key] as T,
  } as ConfigService;
}

function makeRequest(partial: Partial<Request> = {}): Request {
  return {
    ip: '127.0.0.1',
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
    ...partial,
  } as Request;
}

function makeContext(req: Request): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as ExecutionContext;
}

describe('MetricsAuthGuard', () => {
  const nodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = nodeEnv;
  });

  it('production에서 METRICS_ALLOWED_CIDRS 없으면 Forbidden', () => {
    process.env.NODE_ENV = 'production';
    const guard = new MetricsAuthGuard(makeConfig({}));
    expect(() => guard.canActivate(makeContext(makeRequest()))).toThrow(
      ForbiddenException,
    );
  });

  it('production에서 allowlist와 일치하는 IP면 통과', () => {
    process.env.NODE_ENV = 'production';
    const guard = new MetricsAuthGuard(
      makeConfig({ METRICS_ALLOWED_CIDRS: '127.0.0.1' }),
    );
    expect(
      guard.canActivate(makeContext(makeRequest({ ip: '127.0.0.1' }))),
    ).toBe(true);
  });

  it('production에서 allowlist에 없는 IP면 Forbidden', () => {
    process.env.NODE_ENV = 'production';
    const guard = new MetricsAuthGuard(
      makeConfig({ METRICS_ALLOWED_CIDRS: '10.0.0.1' }),
    );
    expect(() =>
      guard.canActivate(makeContext(makeRequest({ ip: '127.0.0.1' }))),
    ).toThrow(ForbiddenException);
  });

  it('production이 아니면 allowlist 없이 통과', () => {
    process.env.NODE_ENV = 'development';
    const guard = new MetricsAuthGuard(makeConfig({}));
    expect(guard.canActivate(makeContext(makeRequest()))).toBe(true);
  });

  it('METRICS_USERNAME·PASSWORD가 있으면 Basic 인증 검사', () => {
    process.env.NODE_ENV = 'development';
    const guard = new MetricsAuthGuard(
      makeConfig({
        METRICS_USERNAME: 'u',
        METRICS_PASSWORD: 'p',
      }),
    );
    const req = makeRequest({
      headers: {
        authorization: 'Basic ' + Buffer.from('u:p').toString('base64'),
      },
    });
    expect(guard.canActivate(makeContext(req))).toBe(true);
  });

  it('Basic 자격이 틀리면 Unauthorized', () => {
    process.env.NODE_ENV = 'development';
    const guard = new MetricsAuthGuard(
      makeConfig({
        METRICS_USERNAME: 'u',
        METRICS_PASSWORD: 'p',
      }),
    );
    const req = makeRequest({
      headers: {
        authorization: 'Basic ' + Buffer.from('other:wrong').toString('base64'),
      },
    });
    expect(() => guard.canActivate(makeContext(req))).toThrow(
      UnauthorizedException,
    );
  });
});
