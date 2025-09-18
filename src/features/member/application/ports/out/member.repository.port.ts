import type { MemberEntity } from '../../../domain/member.entity';
import type { MemberSearchParams } from '../../../domain/member-search.params';
import type { MemberSortOption } from '../../../domain/member-sort.option';

/** 트랜잭션 컨텍스트 (구현체에서 Prisma client로 변환) */
export type TransactionContext = object;

export const MemberRepositoryPort = Symbol('MemberRepositoryPort');

export interface IMemberRepository {
  findMemberByMemberId(memberId: number): Promise<MemberEntity | null>;

  findMembersByIds(memberIds: number[]): Promise<MemberEntity[]>;

  findMembersByCondition(params: MemberSearchParams): Promise<MemberEntity[]>;

  countMembersByCondition(params: MemberSearchParams): Promise<number>;

  findMembersByConditionPaginated(
    params: MemberSearchParams,
    skip: number,
    take: number,
    orderBy?: MemberSortOption,
  ): Promise<MemberEntity[]>;

  updateMemberProfile(
    memberId: number,
    data: {
      profileImageUrl?: string | null;
      nickname?: string | null;
      instagramUrl?: string | null;
      blogUrl?: string | null;
      name?: string;
      clubId?: number | null;
      email?: string;
    },
  ): Promise<MemberEntity>;

  findRoleAssignmentIdByRoleAndClub(
    role: string,
    clubId: number,
  ): Promise<number | null>;

  deleteRoleAssignments(
    memberId: number,
    clubId: number,
    tx?: TransactionContext,
  ): Promise<void>;

  createRoleAssignment(
    data: { clubId: number; memberId: number; role: string },
    tx?: TransactionContext,
  ): Promise<void>;

  updateRoleAssignment(
    roleAssignmentId: number,
    memberId: number,
    tx?: TransactionContext,
  ): Promise<void>;

  transaction<T>(callback: (tx: TransactionContext) => Promise<T>): Promise<T>;

  updateMembersPermission(
    memberIds: number[],
    status: 'ACCEPTED' | 'DENIED',
  ): Promise<void>;

  deleteMember(memberId: number): Promise<void>;

  existsMember(memberId: number): Promise<boolean>;

  findMembersEmailName(
    memberIds: number[],
  ): Promise<Array<{ memberId: number; email: string; name: string }>>;
}
