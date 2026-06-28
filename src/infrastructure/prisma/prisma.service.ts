import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  createMariaDbAdapter,
  isPrismaQueryLogEnabled,
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

    if (isPrismaQueryLogEnabled) {
      this.$on('query', (event) => {
        this.logger.log(
          JSON.stringify({
            type: 'prisma:query',
            timestamp: new Date().toISOString(),
            durationMs: event.duration,
            query: event.query,
          }),
        );
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
