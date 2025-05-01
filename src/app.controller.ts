import { Controller, Get, Inject } from '@nestjs/common';
import { CACHE_MANAGER, RedisCache } from './redis/redis.constants';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: RedisCache,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** 캐시(Redis) 연결 확인용 - set 후 get 해서 동작 여부 검증 */
  @Get('health/cache')
  async checkCache() {
    const testKey = 'cache-health-check';
    const testValue = { ok: true, at: new Date().toISOString() };

    try {
      await this.cacheManager.set(testKey, JSON.stringify(testValue), 10);
      const retrieved = await this.cacheManager.get<string>(testKey);
      const parsed = retrieved ? JSON.parse(retrieved) : null;

      return {
        status: parsed?.ok ? 'ok' : 'fail',
        message: parsed?.ok ? '캐시 정상 동작' : '캐시 조회 실패',
        setAt: testValue.at,
        retrievedAt: parsed?.at,
      };
    } catch (err) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : '캐시 연결 실패',
      };
    }
  }
}
