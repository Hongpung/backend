import { describe, expect, it } from '@jest/globals';
import { DiscardedReservationPersistenceMapper } from './discarded-reservation-persistence.mapper';
import { DiscardedReservationPrismaMapper } from '../prisma/mappers/discarded-reservation.prisma.mapper';

describe('DiscardedReservationPersistenceMapper (legacy re-export)', () => {
  it('PrismaMapper와 동일한 정적 API를 노출한다', () => {
    expect(DiscardedReservationPersistenceMapper).toBe(
      DiscardedReservationPrismaMapper,
    );
    expect(
      DiscardedReservationPersistenceMapper.normalizeStoredSnapshot(null),
    ).toEqual({});
  });
});
