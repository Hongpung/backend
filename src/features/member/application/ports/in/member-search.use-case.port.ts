import type { MemberEntity } from '../../../domain/member.entity';
import type { MemberSearchParams } from '../../../domain/member-search.params';

export const MemberSearchUseCasePort = Symbol('MemberSearchUseCasePort');

/** 페이지 크기 허용값 (20, 40, 80) */
export const ALLOWED_PAGE_SIZES = [10, 20, 50] as const;
export type AllowedPageSize = (typeof ALLOWED_PAGE_SIZES)[number];

export function isAllowedPageSize(value: unknown): value is AllowedPageSize {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (ALLOWED_PAGE_SIZES as readonly number[]).includes(value)
  );
}

export interface MemberSearchPaginatedParams extends MemberSearchParams {
  page?: number;
  pageSize?: AllowedPageSize;
}

export interface MemberSearchPaginatedResult {
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  members: MemberEntity[];
}

export interface InviteSearchParams {
  username?: string;
  clubIds?: number[];
  minEnrollmentNumber?: string;
  maxEnrollmentNumber?: string;
}

export interface MemberSearchUseCasePort {
  /** 관리자 회원 검색 (페이지네이션, pageSize: 20 | 40 | 80) */
  searchMembers(
    params: MemberSearchPaginatedParams,
  ): Promise<MemberSearchPaginatedResult>;
  getInvitePossibleList(
    memberId: number,
    params: InviteSearchParams,
  ): Promise<MemberEntity[]>;
  getRegularParticipatorRecommand(memberId: number): Promise<MemberEntity[]>;
}
