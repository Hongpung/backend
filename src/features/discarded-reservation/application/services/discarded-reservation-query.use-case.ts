import { Inject, Injectable } from '@nestjs/common';
import {
  DiscardedReservationRepositoryPort,
  IDiscardedReservationRepository,
} from 'src/features/discarded-reservation/application/ports/out/discarded-reservation.repository.port';
import { DiscardedReservationListVO } from 'src/features/discarded-reservation/domain/discarded-reservation.vo';
import { DiscardedReservationQueryUseCasePort } from '../ports/in/discarded-reservation-query.use-case.port';

@Injectable()
export class DiscardedReservationQueryUseCase
  implements DiscardedReservationQueryUseCasePort
{
  constructor(
    @Inject(DiscardedReservationRepositoryPort)
    private readonly discardedReservationRepository: IDiscardedReservationRepository,
  ) {}

  async getDiscardedReservations(
    skip: number = 0,
    take: number = 20,
  ): Promise<DiscardedReservationListVO> {
    return this.discardedReservationRepository.findLatest(skip, take);
  }
}
