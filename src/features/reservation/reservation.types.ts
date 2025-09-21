// ReservationType을 먼저 정의 (다른 타입에서 사용)
export const RESERVATION_TYPES = ['REGULAR', 'COMMON', 'EXTERNAL'] as const;
export type ReservationType = (typeof RESERVATION_TYPES)[number];

export interface User {
  memberId: number;
  email: string;
  name: string;
  nickname?: string;
  club: string;
  enrollmentNumber: string;
  role: string[];
  profileImageUrl?: string;
}

export interface BriefInstrument {
  instrumentId: number;
  imageUrl?: string; // url
  name: string;
  instrumentType: string;
  club: string;
  borrowAvailable: boolean;
}
