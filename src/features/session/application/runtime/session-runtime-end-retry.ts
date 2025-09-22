const DEFAULT_RUNTIME_END_ATTEMPTS = 3;
const DEFAULT_RUNTIME_END_BASE_DELAY_MS = 50;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * persist 성공 직후 mutex·캐시 경합으로 runtime end가 한 번 실패할 수 있어 짧게 재시도한다.
 */
export async function retryRuntimeEnd<T>(
  attempt: () => Promise<T>,
  isSuccess: (value: T) => boolean,
  options?: { attempts?: number; baseDelayMs?: number },
): Promise<T | null> {
  const attempts = options?.attempts ?? DEFAULT_RUNTIME_END_ATTEMPTS;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_RUNTIME_END_BASE_DELAY_MS;

  for (let i = 0; i < attempts; i++) {
    const value = await attempt();
    if (isSuccess(value)) {
      return value;
    }
    if (i < attempts - 1) {
      await delay(baseDelayMs * (i + 1));
    }
  }

  return null;
}
