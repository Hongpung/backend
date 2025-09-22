import { EnRole } from 'src/role/role.type';
import type { SessionUser } from '../../../domain/value-objects/session-user.vo';

export const SessionRepositoryPort = Symbol('SessionRepositoryPort');

export interface MemberForCheckIn {
  memberId: number;
  email: string;
  name: string;
  nickname: string | null;
  club: {
    clubName: string;
  } | null;
  profileImageUrl: string | null;
  enrollmentNumber: string;
  roleAssignment: Array<{
    role: EnRole;
  }>;
}

export type MemberForCheckInWithClubAndRoles = MemberForCheckIn & {
  club: NonNullable<MemberForCheckIn['club']>;
  roleAssignment: NonNullable<MemberForCheckIn['roleAssignment']>;
};

export interface ISessionRepository {
  findMemberForCheckIn(memberId: number): Promise<MemberForCheckIn | null>;
  toSessionUserFromCheckInMember(
    member: MemberForCheckInWithClubAndRoles,
  ): SessionUser;
}
