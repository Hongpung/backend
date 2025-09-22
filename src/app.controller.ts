import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { CACHE_MANAGER, RedisCache } from '@hongpung/redis';

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
      await this.cacheManager.set(testKey, testValue, 10);
      const retrieved = await this.cacheManager.get<{
        ok?: boolean;
        at?: string;
      }>(testKey);

      return {
        status: retrieved?.ok ? 'ok' : 'fail',
        message: retrieved?.ok ? '캐시 정상 동작' : '캐시 조회 실패',
        setAt: testValue.at,
        retrievedAt: retrieved?.at,
      };
    } catch (err) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : '캐시 연결 실패',
      };
    }
  }
}
