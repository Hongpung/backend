import { ReservationType } from 'src/features/reservation/reservation.types';

/** ReservationEntity를 BullMQ job payload로 직렬화한 wire 형태 */
export interface ReservationSerializedDto {
  reservationId?: number;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  reservationType: ReservationType;
  participationAvailable: boolean;
  creator: {
    memberId: number;
    name: string;
    nickname: string | null;
    email: string;
    enrollmentNumber: string;
    profileImageUrl: string | null;
    blogUrl: string | null;
    instagramUrl: string | null;
    clubName: string | null;
    roles: string[];
  };
  participators: Array<{
    memberId: number;
    name: string;
    nickname: string | null;
    email: string;
    enrollmentNumber: string;
    profileImageUrl: string | null;
    blogUrl: string | null;
    instagramUrl: string | null;
    clubName: string | null;
    roles: string[];
  }>;
  borrowInstruments: Array<{
    instrumentId: number;
    name: string;
    instrumentType: string;
    imageUrl: string | null;
    borrowAvailable: boolean;
    clubName: string;
  }>;
}
