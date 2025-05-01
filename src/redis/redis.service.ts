import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisCache } from './redis.constants';

/**
 * ioredis 기반 Redis 서비스 (RedisCache 인터페이스 구현)
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy, RedisCache {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get('REDIS_HOST') ?? 'localhost';
    const port = this.configService.get('REDIS_PORT') ?? 6379;
    const username = this.configService.get('REDIS_USERNAME');
    const password = this.configService.get('REDIS_PASSWORD');

    this.client = new Redis({
      host,
      port: Number(port),
      username: username || undefined,
      password: password || undefined,
    });

    this.client.on('connect', () => {
      console.log('[Redis] Connected');
    });
    this.client.on('error', (err) => {
      console.error('[Redis] Error:', err.message);
    });
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  /** Redis 클라이언트 직접 접근 (고급 사용) */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Cache 인터페이스 호환: get
   * ttl > 86400 이면 밀리초로 간주, 아니면 초로 간주
   */
  async get<T>(key: string): Promise<T | undefined> {
    const val = await this.client.get(key);
    if (val === null) return undefined;
    try {
      return JSON.parse(val) as T;
    } catch {
      return val as T;
    }
  }

  /**
   * Cache 인터페이스 호환: set
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serialized =
      typeof value === 'string' ? value : JSON.stringify(value);
    await this.client.set(key, serialized);

    if (ttl !== undefined && ttl > 0) {
      const ttlSeconds = ttl > 86400 ? Math.ceil(ttl / 1000) : ttl;
      await this.client.expire(key, ttlSeconds);
    }
  }

  /**
   * Cache 인터페이스 호환: del
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
