import { Inject, Injectable } from '@nestjs/common';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';
import { ReservationBorrowInstrument } from 'src/features/reservation/domain/entities/reservation-borrow-instrument.entity';
import { ReservationMemberLookupPort } from 'src/features/reservation/application/ports/out/reservation-member-lookup.port';
import { ReservationInstrumentLookupPort } from 'src/features/reservation/application/ports/out/reservation-instrument-lookup.port';

@Injectable()
export class CreateReservationResourceLoaderService {
  constructor(
    @Inject(ReservationMemberLookupPort)
    private readonly memberLookup: ReservationMemberLookupPort,
    @Inject(ReservationInstrumentLookupPort)
    private readonly instrumentLookup: ReservationInstrumentLookupPort,
  ) {}

  async loadCreator(memberId: number): Promise<ReservationCreator> {
    return this.memberLookup.loadCreator(memberId);
  }

  async loadCreatorAndParticipators(
    memberId: number,
    participatorIds: number[],
  ): Promise<{
    creator: ReservationCreator;
    participators: ReservationParticipator[];
  }> {
    return this.memberLookup.loadCreatorAndParticipators(
      memberId,
      participatorIds,
    );
  }

  async loadParticipatorsById(
    memberIds: number[],
  ): Promise<ReservationParticipator[]> {
    return this.memberLookup.loadParticipatorsById(memberIds);
  }

  async loadBorrowInstruments(
    borrowInstrumentIds: number[],
    options?: { strict?: boolean },
  ): Promise<ReservationBorrowInstrument[]> {
    return this.instrumentLookup.loadBorrowInstruments(
      borrowInstrumentIds,
      options,
    );
  }
}
