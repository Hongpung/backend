import { ReservationType } from 'src/features/reservation/reservation.types';

export interface ReservationResponseReadModel {
  reservationId: number;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  creatorId?: number;
  creatorName: string;
  creatorNickname?: string;
  reservationType: ReservationType;
  participationAvailable: boolean;
  amountOfParticipators: number;
}

export interface ReservationParticipatorReadModel {
  memberId: number;
  profileImageUrl: string | null;
  name: string;
  nickname: string | null;
  club: string | null;
  blogUrl: string | null;
  instagramUrl: string | null;
  enrollmentNumber: string;
  role: string[];
}

export interface ReservationBorrowInstrumentReadModel {
  instrumentId: number;
  name: string;
  instrumentType: string;
  imageUrl: string | null;
  club: string;
}

export interface OccupiedTimeSlotResponseReadModel {
  reservationId: number;
  title: string;
  reservationType: string;
  startTime: string;
  endTime: string;
  creator?: { name: string } | null;
  externalCreatorName?: string | null;
}

export interface ReservationDetailResponseReadModel {
  reservationId: number;
  title: string;
  reservationType: ReservationType;
  participationAvailable: boolean;
  creatorId?: number;
  creatorName?: string | null;
  creatorNickname?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  participators?: ReservationParticipatorReadModel[];
  borrowInstruments?: ReservationBorrowInstrumentReadModel[];
}
