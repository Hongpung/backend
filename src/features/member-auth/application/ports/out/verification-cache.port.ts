export const VerificationCachePort = Symbol('VerificationCachePort');

export interface IVerificationCache {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
}
