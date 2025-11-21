import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateReservationPolicyService } from './create-reservation-policy.service';
import type { IReservationRepository } from '../../ports/out/reservation.repository.port';

describe('CreateReservationPolicyService', () => {
  let service: CreateReservationPolicyService;
  let repository: jest.Mocked<
    Pick<IReservationRepository, 'someConflictReservation'>
  >;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    repository = {
      someConflictReservation: jest.fn(),
    };
    service = new CreateReservationPolicyService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('validateDeadline: 마감 시각을 지났으면 ForbiddenException', () => {
    jest.setSystemTime(new Date('2026-04-30T13:00:00.001Z'));
    expect(() => service.validateDeadline('2026-05-01')).toThrow(
      ForbiddenException,
    );
  });

  it('validateDeadline: 마감 전이면 예외 없이 통과', () => {
    jest.setSystemTime(new Date('2026-04-30T12:00:00.000Z'));
    expect(() => service.validateDeadline('2026-05-01')).not.toThrow();
  });

  it('assertNoConflict: 시간대가 겹치면 ConflictException', async () => {
    repository.someConflictReservation.mockResolvedValue(true);
    await expect(
      service.assertNoConflict(
        repository as unknown as IReservationRepository,
        {
          date: '2026-05-01',
          startTime: '10:00',
          endTime: '11:00',
        },
      ),
    ).rejects.toThrow(ConflictException);
    expect(repository.someConflictReservation).toHaveBeenCalledWith(
      { date: '2026-05-01', startTime: '10:00', endTime: '11:00' },
      undefined,
    );
  });

  it('assertNoConflict: 겹침이 없으면 통과', async () => {
    repository.someConflictReservation.mockResolvedValue(false);
    await expect(
      service.assertNoConflict(
        repository as unknown as IReservationRepository,
        {
          date: '2026-05-01',
          startTime: '10:00',
          endTime: '11:00',
        },
      ),
    ).resolves.toBeUndefined();
  });
});
