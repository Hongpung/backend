import type { MemberAuthEntity } from '../../../domain/member-auth.entity';

export const MemberAuthRepositoryPort = Symbol('MemberAuthRepositoryPort');

export interface MemberLoginInfo {
  clubId: number | null;
  canLogin: boolean;
}

export interface PendingSignupRecord {
  memberId: number;
  email: string;
  name: string;
  nickname: string | null;
  clubId: number | null;
  clubName: string | null;
  enrollmentNumber: string;
}

export interface IMemberAuthRepository {
  findAuthByEmail(email: string): Promise<MemberAuthEntity | null>;

  findAuthByMemberId(memberId: number): Promise<MemberAuthEntity | null>;

  isRegisteredEmail(email: string): Promise<boolean>;

  findClubById(
    clubId: number,
  ): Promise<{ clubId: number; clubName: string } | null>;

  findMemberForLogin(memberId: number): Promise<MemberLoginInfo | null>;

  signup(data: {
    email: string;
    password: string;
    name: string;
    enrollmentNumber: string;
    clubId?: number | null;
    nickname?: string | null;
  }): Promise<void>;

  updateAuthPermission(
    memberIds: number[],
    permission: 'ACCEPTED' | 'DENIED',
  ): Promise<void>;

  updateAuthPassword(memberId: number, password: string): Promise<void>;

  updateAuthPasswordByEmail(email: string, password: string): Promise<void>;

  deleteAuth(memberId: number): Promise<void>;

  findPendingSignupIds(): Promise<PendingSignupRecord[]>;

  findPendingSignupIdsByClubId(clubId: number): Promise<PendingSignupRecord[]>;

  findMembersEmailName(
    memberIds: number[],
  ): Promise<Array<{ memberId: number; email: string; name: string }>>;
}
