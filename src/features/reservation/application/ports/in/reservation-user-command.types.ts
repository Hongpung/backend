import type { ReservationType } from 'src/features/reservation/reservation.types';

export interface CreateReservationInput {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  reservationType: Exclude<ReservationType, 'EXTERNAL'>;
  participationAvailable: boolean;
  participatorIds: number[];
  borrowInstrumentIds: number[];
}

export interface UpdateReservationInput {
  date?: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  reservationType?: Exclude<ReservationType, 'EXTERNAL'>;
  participationAvailable?: boolean;
  participatorIds?: number[];
  borrowInstrumentIds?: number[];
  addedParticipatorIds?: number[];
  removedParticipatorIds?: number[];
  addedBorrowInstrumentIds?: number[];
  removedBorrowInstrumentIds?: number[];
}

export interface ForceCreateReservationInput {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  externalCreatorName?: string;
  creatorId?: number;
  reservationType: ReservationType;
  participationAvailable: boolean;
  participatorIds?: number[];
  borrowInstrumentIds?: number[];
}

export type ForceUpdateReservationInput = Partial<ForceCreateReservationInput>;

type BatchReservationOptions<T extends ReservationType> = {
  title: string;
  reservationType: T;
} & (T extends 'EXTERNAL'
  ? { creatorName: string; creatorId?: undefined }
  : { creatorName?: undefined; creatorId: number });

export interface BatchReservationInput<T extends ReservationType> {
  dayTimes: { day: string; startTime: string; endTime: string }[];
  duration: { startDate: string; endDate: string };
  batchReservationOption: BatchReservationOptions<T>;
}
