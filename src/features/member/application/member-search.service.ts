import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  MemberSearchUseCasePort,
  type InviteSearchParams,
  type MemberSearchPaginatedParams,
  ALLOWED_PAGE_SIZES,
} from './ports/in/member-search.use-case.port';
import {
  MemberRepositoryPort,
  type IMemberRepository,
} from './ports/out/member.repository.port';
import type { MemberSearchParams } from '../domain/member-search.params';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class MemberSearchService implements MemberSearchUseCasePort {
  constructor(
    @Inject(MemberRepositoryPort)
    private readonly repository: IMemberRepository,
  ) {}

  async searchMembers(params: MemberSearchPaginatedParams) {
    const { page = 0, pageSize, ...searchParams } = params;
    const take = this.resolvePageSize(pageSize);
    const skip = page * take;

    const fullParams: MemberSearchParams = {
      ...searchParams,
      isPermitted: searchParams.isPermitted ?? 'ACCEPTED',
    };

    const totalCount =
      await this.repository.countMembersByCondition(fullParams);
    const members = await this.repository.findMembersByConditionPaginated(
      fullParams,
      skip,
      take,
      { enrollmentNumber: 'asc' },
    );

    return {
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      page,
      pageSize: take,
      members,
    };
  }

  private resolvePageSize(
    pageSize?: (typeof ALLOWED_PAGE_SIZES)[number],
  ): number {
    if (pageSize === undefined) return DEFAULT_PAGE_SIZE;
    return ALLOWED_PAGE_SIZES.includes(pageSize) ? pageSize : DEFAULT_PAGE_SIZE;
  }

  async getInvitePossibleList(memberId: number, params: InviteSearchParams) {
    const hasFilters =
      !!params.username?.trim() ||
      (params.clubIds && params.clubIds.length > 0) ||
      !!params.minEnrollmentNumber ||
      !!params.maxEnrollmentNumber;

    const searchParams: MemberSearchParams = hasFilters
      ? {
          username: params.username,
          clubIds: params.clubIds,
          minEnrollmentNumber: params.minEnrollmentNumber,
          maxEnrollmentNumber: params.maxEnrollmentNumber,
        }
      : {};

    const members = await this.repository.findMembersByCondition(searchParams);
    return members.filter((m) => m.memberId !== memberId);
  }

  async getRegularParticipatorRecommand(memberId: number) {
    const member = await this.repository.findMemberByMemberId(memberId);

    if (!member || !member.hasClub()) {
      throw new NotFoundException(`MemberId: '${memberId}' is not exist`);
    }

    const members = await this.repository.findMembersByCondition({
      clubId: member.clubId!,
      isPermitted: 'ACCEPTED',
    });

    return members.filter((m) => m.memberId !== memberId);
  }
}
