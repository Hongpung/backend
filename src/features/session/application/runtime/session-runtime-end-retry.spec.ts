import { describe, expect, it, jest } from '@jest/globals';
import { retryRuntimeEnd } from './session-runtime-end-retry';

describe('retryRuntimeEnd', () => {
  it('첫 시도 성공 시 재시도하지 않는다', async () => {
    const attempt = jest.fn(async () => 'ok');

    const result = await retryRuntimeEnd(attempt, (v) => v === 'ok');

    expect(result).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('실패 후 성공하면 재시도한다', async () => {
    const attempt = jest
      .fn<() => Promise<string | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('ok');

    const result = await retryRuntimeEnd(
      attempt,
      (v): v is string => v === 'ok',
      { baseDelayMs: 0 },
    );

    expect(result).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it('모든 시도가 실패하면 null을 반환한다', async () => {
    const attempt = jest.fn(async () => null);

    const result = await retryRuntimeEnd(
      attempt,
      (v): v is string => v === 'ok',
      { attempts: 2, baseDelayMs: 0 },
    );

    expect(result).toBeNull();
    expect(attempt).toHaveBeenCalledTimes(2);
  });
});
