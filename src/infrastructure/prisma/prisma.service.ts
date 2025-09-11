import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  createMariaDbAdapter,
  prismaQueryLog,
  resolveDatabaseUrl,
} from './create-prisma-client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      adapter: createMariaDbAdapter(resolveDatabaseUrl()),
      log: prismaQueryLog,
    });

    this.$on('query', (event) => {
      this.logger.log(
        JSON.stringify({
          type: 'prisma:query',
          timestamp: new Date().toISOString(),
          durationMs: event.duration,
          query: event.query,
          params: event.params,
          target: event.target,
        }),
      );
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
