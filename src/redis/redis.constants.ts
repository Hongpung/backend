/** Redis 캐시 주입 토큰 (기존 CACHE_MANAGER 호환) */
export const CACHE_MANAGER = 'CACHE_MANAGER';

/** Redis 캐시 인터페이스 (get, set, del) */
export interface RedisCache {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}
