import { Injectable } from '@nestjs/common';
import { RpcTimeoutError } from './rpc-timeout.error';
import type { RpcBusPort } from './rpc-bus.port';

type RpcHandler = (payload: unknown) => Promise<unknown>;

@Injectable()
export class InProcessRpcBus implements RpcBusPort {
  private readonly handlers = new Map<string, RpcHandler>();

  register<Request, Response>(
    key: string,
    handler: (payload: Request) => Promise<Response>,
  ): void {
    if (this.handlers.has(key)) {
      throw new Error(`RPC handler already registered: ${key}`);
    }
    this.handlers.set(key, handler as RpcHandler);
  }

  async request<Request, Response>(
    key: string,
    payload: Request,
    options?: { timeoutMs?: number },
  ): Promise<Response> {
    const handler = this.handlers.get(key);
    if (!handler) {
      throw new Error(`RPC handler not found: ${key}`);
    }

    const timeoutMs = options?.timeoutMs ?? 10_000;
    return withTimeout(
      handler(payload) as Promise<Response>,
      timeoutMs,
      () => new RpcTimeoutError(key, timeoutMs),
    );
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  createError: () => Error,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(createError());
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}
