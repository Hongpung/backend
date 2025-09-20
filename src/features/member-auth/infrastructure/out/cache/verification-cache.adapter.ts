import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER, RedisCache } from '@hongpung/redis';
import { IVerificationCache } from '../../../application/ports/out/verification-cache.port';

@Injectable()
export class VerificationCacheAdapter implements IVerificationCache {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: RedisCache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    await this.cache.set(key, value, ttlMs);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }
}
