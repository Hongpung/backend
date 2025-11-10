import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { SessionRuntimeMappingCleanupService } from './session-runtime-mapping-cleanup.service';

describe('SessionRuntimeMappingCleanupService', () => {
  let prisma: { sessionRuntimeMapping: { deleteMany: jest.Mock } };
  let service: SessionRuntimeMappingCleanupService;

  beforeEach(() => {
    prisma = {
      sessionRuntimeMapping: {
        deleteMany: jest.fn().mockResolvedValue({ count: 5 } as never),
      },
    };
    service = new SessionRuntimeMappingCleanupService(
      prisma as unknown as PrismaService,
    );
  });

  it('deleteMany로 mapping 테이블 전체를 비운다', async () => {
    const count = await service.purgeAllMappings();

    expect(count).toBe(5);
    expect(prisma.sessionRuntimeMapping.deleteMany).toHaveBeenCalledWith();
  });
});
