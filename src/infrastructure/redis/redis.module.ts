import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CACHE_MANAGER } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RedisService,
    {
      provide: CACHE_MANAGER,
      useExisting: RedisService,
    },
  ],
  exports: [RedisService, CACHE_MANAGER],
})
export class RedisModule {}
