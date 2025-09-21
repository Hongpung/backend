import { ReservationBorrowInstrument } from 'src/features/reservation/domain/entities/reservation-borrow-instrument.entity';

export const ReservationInstrumentLookupPort = Symbol(
  'ReservationInstrumentLookupPort',
);

export interface ReservationInstrumentLookupPort {
  loadBorrowInstruments(
    borrowInstrumentIds: number[],
    options?: { strict?: boolean },
  ): Promise<ReservationBorrowInstrument[]>;
}
