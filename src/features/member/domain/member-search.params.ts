import type { KoRole } from 'src/role/role.type';

export interface MemberSearchParams {
  username?: string;
  clubId?: number;
  clubIds?: number[];
  role?: KoRole;
  isPermitted?: 'ACCEPTED' | 'PENDING' | 'DENIED';
  minEnrollmentNumber?: string;
  maxEnrollmentNumber?: string;
}
