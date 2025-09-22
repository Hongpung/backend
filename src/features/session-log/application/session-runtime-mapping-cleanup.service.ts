import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';

@Injectable()
export class SessionRuntimeMappingCleanupService {
  private readonly logger = new Logger(SessionRuntimeMappingCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 멱등 인덱스만 비운다. Session 로그 row는 유지한다. */
  async purgeAllMappings(): Promise<number> {
    const result = await this.prisma.sessionRuntimeMapping.deleteMany();
    this.logger.log(
      `Purged ${result.count} session runtime mapping row(s).`,
    );
    return result.count;
  }
}
