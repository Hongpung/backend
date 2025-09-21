import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';

export const ReservationMemberLookupPort = Symbol(
  'ReservationMemberLookupPort',
);

export interface ReservationMemberLookupPort {
  loadCreator(memberId: number): Promise<ReservationCreator>;

  loadCreatorAndParticipators(
    memberId: number,
    participatorIds: number[],
  ): Promise<{
    creator: ReservationCreator;
    participators: ReservationParticipator[];
  }>;

  loadParticipatorsById(
    memberIds: number[],
  ): Promise<ReservationParticipator[]>;
}
