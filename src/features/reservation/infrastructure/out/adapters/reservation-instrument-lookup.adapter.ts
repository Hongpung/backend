import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ReservationBorrowInstrument } from 'src/features/reservation/domain/entities/reservation-borrow-instrument.entity';
import {
  InstrumentRepositoryPort,
  type IInstrumentRepository,
} from 'src/features/instrument/repositories/instrument.repository.port';
import { ReservationInstrumentLookupPort } from 'src/features/reservation/application/ports/out/reservation-instrument-lookup.port';

@Injectable()
export class ReservationInstrumentLookupAdapter
  implements ReservationInstrumentLookupPort
{
  constructor(
    @Inject(InstrumentRepositoryPort)
    private readonly instrumentRepository: IInstrumentRepository,
  ) {}

  async loadBorrowInstruments(
    borrowInstrumentIds: number[],
    options?: { strict?: boolean },
  ): Promise<ReservationBorrowInstrument[]> {
    if (borrowInstrumentIds.length === 0) return [];

    const instruments =
      await this.instrumentRepository.findByIds(borrowInstrumentIds);

    const foundIds = instruments.map((i) => i.instrumentId);
    const missingIds = borrowInstrumentIds.filter(
      (id) => !foundIds.includes(id),
    );
    if (options?.strict !== false && missingIds.length > 0) {
      throw new ForbiddenException(
        `악기 정보를 찾을 수 없습니다: ${missingIds.join(', ')}`,
      );
    }

    return instruments.map((instrument) =>
      ReservationBorrowInstrument.create({
        instrumentId: instrument.instrumentId,
        name: instrument.name,
        instrumentType: instrument.instrumentType,
        imageUrl: instrument.imageUrl,
        borrowAvailable: instrument.borrowAvailable,
        clubName: instrument.club.clubName,
      }),
    );
  }
}
