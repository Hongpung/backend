import { BadRequestException } from '@nestjs/common';
import { RoleEnum } from 'src/role/role.enum';
import type { KoRole } from 'src/role/role.type';
import type {
  UpdateMemberByAdminParams,
  UpdateMemberProfileParams,
} from '../../../../application/ports/in/member-profile.use-case.port';
import {
  type InviteSearchParams,
  type MemberSearchPaginatedParams,
  ALLOWED_PAGE_SIZES,
  isAllowedPageSize,
} from '../../../../application/ports/in/member-search.use-case.port';
import type { UpdateMemberByAdminReqDto } from '../../dto/request/update-member-by-admin.req.dto';
import type { UpdateMyStatusReqDto } from '../../dto/request/update-my-status.req.dto';
import type { RoleAssignmentReqDto } from '../../dto/request/role-assignment.req.dto';
/**
 * Request DTO / Query → Application params 변환
 * Infra가 Application 타입으로 변환하여 전달
 */
export class MemberRequestMapper {
  static toUpdateMemberProfileParams(
    dto: UpdateMyStatusReqDto,
  ): UpdateMemberProfileParams {
    return {
      profileImageUrl: dto.profileImageUrl,
      nickname: dto.nickname,
      instagramUrl: dto.instagramUrl,
      blogUrl: dto.blogUrl,
    };
  }

  static toUpdateMemberByAdminParams(
    dto: UpdateMemberByAdminReqDto,
  ): UpdateMemberByAdminParams {
    return {
      nickname: dto.nickname,
      name: dto.name,
      clubId: dto.clubId,
      email: dto.email,
      adminPassword: dto.adminPassword,
    };
  }

  static toRoleAssignmentParams(dto: RoleAssignmentReqDto): {
    roles: KoRole[];
  } {
    return { roles: dto.role as KoRole[] };
  }

  static toMemberSearchPaginatedParams(query: {
    username?: string;
    clubId?: number;
    role?: string;
    page?: number;
    pageSize?: number;
  }): MemberSearchPaginatedParams {
    if (query.role !== undefined && !RoleEnum.isValidKoRole(query.role)) {
      throw new BadRequestException('Invalid role');
    }
    const pageSize = this.parsePageSize(query.pageSize);
    return {
      username: query.username,
      clubId: query.clubId !== undefined ? query.clubId : undefined,
      role:
        query.role && RoleEnum.isValidKoRole(query.role)
          ? (query.role as KoRole)
          : undefined,
      page: query.page ? +query.page : undefined,
      pageSize,
    };
  }

  private static parsePageSize(
    value?: number,
  ): MemberSearchPaginatedParams['pageSize'] | undefined {
    if (value === undefined) return undefined;
    if (!isAllowedPageSize(value)) {
      throw new BadRequestException(
        `pageSize must be one of ${ALLOWED_PAGE_SIZES.join(', ')}`,
      );
    }
    return value;
  }

  static toInviteSearchParams(
    memberId: number,
    query: {
      username?: string;
      clubId?: string[];
      minEnrollmentNumber?: string;
      maxEnrollmentNumber?: string;
    },
  ): { memberId: number; params: InviteSearchParams } {
    const clubIds: number[] = query.clubId ? query.clubId.map((c) => +c) : [];

    return {
      memberId,
      params: {
        username: query.username,
        clubIds: clubIds.length > 0 ? clubIds : undefined,
        minEnrollmentNumber: query.minEnrollmentNumber,
        maxEnrollmentNumber: query.maxEnrollmentNumber,
      },
    };
  }
}
