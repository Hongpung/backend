import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { SessionLogPrismaRepository } from './session-log.prisma.repository';

describe('SessionLogPrismaRepository.findAdminSessionCalendarForMonth', () => {
  const groupBy = jest.fn<(args: unknown) => Promise<unknown[]>>();
  let repository: SessionLogPrismaRepository;

  beforeEach(() => {
    groupBy.mockReset();
    groupBy.mockResolvedValue([]);
    repository = new SessionLogPrismaRepository({
      session: { groupBy },
    } as unknown as PrismaService);
  });

  it('KST 로컬 자정이 아니라 DB date 앵커로 해당 월 1일~말일을 조회한다', async () => {
    await repository.findAdminSessionCalendarForMonth(2026, 11);

    expect(groupBy).toHaveBeenCalledWith({
      by: ['date'],
      where: {
        date: {
          gte: AppKstDateTime.dateFormmatForDB('2026-11-01'),
          lte: AppKstDateTime.dateFormmatForDB('2026-11-30'),
        },
      },
      _count: { _all: true },
    });
  });
});
