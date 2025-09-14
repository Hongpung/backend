import type { EnRole } from 'src/role/role.type';

export interface Member {
  memberId: number;
  name: string;
  nickname: string;
  email: string;
  clubName: string;
  enrollmentNumber: string;
  profileImageUrl: string;
  instagramUrl: string;
  blogUrl: string;
  roleAssignment: EnRole[];
}

export function createMember(data: {
  memberId: number;
  name: string;
  nickname: string;
  email: string;
  clubName: string;
  enrollmentNumber: string;
  profileImageUrl?: string;
  instagramUrl?: string;
  blogUrl?: string;
  roleAssignment?: EnRole[];
}): Member {
  return {
    memberId: data.memberId,
    name: data.name,
    nickname: data.nickname,
    email: data.email,
    clubName: data.clubName,
    enrollmentNumber: data.enrollmentNumber,
    profileImageUrl: data.profileImageUrl ?? '',
    instagramUrl: data.instagramUrl ?? '',
    blogUrl: data.blogUrl ?? '',
    roleAssignment: data.roleAssignment ?? [],
  };
}

export interface Role {
  role: EnRole;
  member: Member;
}

export function createRole(data: { role: EnRole; member: Member }): Role {
  return { role: data.role, member: data.member };
}

export interface Instrument {
  instrumentId: number;
  name: string;
  instrumentType: string;
  imageUrl: string;
  borrowAvailable: boolean;
}

export function createInstrument(data: {
  instrumentId: number;
  name: string;
  instrumentType: string;
  imageUrl?: string;
  borrowAvailable: boolean;
}): Instrument {
  return {
    instrumentId: data.instrumentId,
    name: data.name,
    instrumentType: data.instrumentType,
    imageUrl: data.imageUrl ?? '',
    borrowAvailable: data.borrowAvailable,
  };
}

export interface ClubPrimaryMember {
  member: Member;
  updatedAt: Date;
}

export function createClubPrimaryMember(data: {
  member: Member;
  updatedAt: Date;
}): ClubPrimaryMember {
  return { member: data.member, updatedAt: data.updatedAt };
}

export interface Club {
  clubId: number;
  clubName: string;
  profileImageUrl?: string | null;
  roleAssignment?: Role[];
  members?: Member[];
  primaryMembers?: ClubPrimaryMember[];
  instruments?: Instrument[];
}

export function createClub(data: {
  clubId: number;
  clubName: string;
  profileImageUrl?: string | null;
  roleAssignment?: Role[];
  members?: Member[];
  primaryMembers?: ClubPrimaryMember[];
  instruments?: Instrument[];
}): Club {
  return {
    clubId: data.clubId,
    clubName: data.clubName,
    profileImageUrl: data.profileImageUrl ?? null,
    roleAssignment: data.roleAssignment,
    members: data.members,
    primaryMembers: data.primaryMembers,
    instruments: data.instruments,
  };
}

/** @deprecated 테스트·마이그레이션 호환 — createClub 사용 권장 */
export const ClubEntity = { create: createClub };
/** @deprecated createMember 사용 권장 */
export const MemberValueObject = { create: createMember };
/** @deprecated createRole 사용 권장 */
export const RoleValueObject = { create: createRole };
/** @deprecated createInstrument 사용 권장 */
export const InstrumentValueObject = { create: createInstrument };
/** @deprecated createClubPrimaryMember 사용 권장 */
export const ClubPrimaryMemberValueObject = {
  create: createClubPrimaryMember,
};
