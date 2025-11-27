import { describe, expect, it, jest } from '@jest/globals';
import { InProcessRpcBus } from './in-process-rpc.bus';
import { RpcTimeoutError } from './rpc-timeout.error';

describe('InProcessRpcBus', () => {
  it('등록된 handler에 request를 위임한다', async () => {
    const bus = new InProcessRpcBus();
    bus.register('echo', async (payload: { value: number }) => ({
      value: payload.value + 1,
    }));

    const result = await bus.request<{ value: number }, { value: number }>(
      'echo',
      { value: 1 },
    );

    expect(result).toEqual({ value: 2 });
  });

  it('handler가 없으면 에러를 던진다', async () => {
    const bus = new InProcessRpcBus();
    await expect(bus.request('missing', {})).rejects.toThrow(
      'RPC handler not found: missing',
    );
  });

  it('중복 register는 에러를 던진다', () => {
    const bus = new InProcessRpcBus();
    bus.register('dup', async () => ({}));
    expect(() => bus.register('dup', async () => ({}))).toThrow(
      'RPC handler already registered: dup',
    );
  });

  it('timeoutMs 내 응답이 없으면 RpcTimeoutError를 던진다', async () => {
    const bus = new InProcessRpcBus();
    bus.register('slow', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { ok: true };
    });

    await expect(
      bus.request('slow', {}, { timeoutMs: 5 }),
    ).rejects.toBeInstanceOf(RpcTimeoutError);
  });
});
