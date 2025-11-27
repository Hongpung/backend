import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { DiscardedReservationQueryUseCase } from './services/discarded-reservation-query.use-case';
import { DiscardedReservationQueryUseCasePort } from './ports/in/discarded-reservation-query.use-case.port';
import { DiscardedReservationRepositoryPort } from './ports/out/discarded-reservation.repository.port';

describe('DiscardedReservation Inbound Wiring', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        DiscardedReservationQueryUseCase,
        {
          provide: DiscardedReservationRepositoryPort,
          useValue: {
            findLatest: jest.fn(async () => ({
              items: [],
              total: 0,
            })),
          },
        },
        {
          provide: DiscardedReservationQueryUseCasePort,
          useExisting: DiscardedReservationQueryUseCase,
        },
      ],
    }).compile();
  });

  it('resolves inbound port to existing use case instance', async () => {
    const port = moduleRef.get(DiscardedReservationQueryUseCasePort);
    const concrete = moduleRef.get(DiscardedReservationQueryUseCase);
    expect(port).toBe(concrete);
  });
});
