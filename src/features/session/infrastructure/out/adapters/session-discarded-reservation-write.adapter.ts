import { Inject, Injectable } from '@nestjs/common';
import {
  DiscardedReservationRepositoryPort,
  type DiscardedReservationRepositoryPort as IDiscardedReservationRepositoryPort,
} from 'src/features/discarded-reservation/application/ports/out/discarded-reservation.repository.port';
import { SessionDiscardedReservationWritePort } from '../../../application/ports/out/session-discarded-reservation-write.port';

@Injectable()
export class SessionDiscardedReservationWriteAdapter
  implements SessionDiscardedReservationWritePort
{
  constructor(
    @Inject(DiscardedReservationRepositoryPort)
    private readonly discardedReservationRepository: IDiscardedReservationRepositoryPort,
  ) {}

  async saveNoShowByReservationId(
    reservationId: number,
    reason: 'NO_SHOW' = 'NO_SHOW',
  ): Promise<void> {
    await this.discardedReservationRepository.saveNoShowByReservationId(
      reservationId,
      reason,
    );
  }
}
