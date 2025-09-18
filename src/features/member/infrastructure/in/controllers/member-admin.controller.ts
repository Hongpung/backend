import {
  Controller,
  Body,
  Param,
  Patch,
  Get,
  UseGuards,
  Query,
  Inject,
  ParseIntPipe,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AdminAccessGuard } from 'src/security/presentation/guards/admin-access.guard';
import { MemberProfileUseCasePort } from '../../../application/ports/in/member-profile.use-case.port';
import { MemberRoleUseCasePort } from '../../../application/ports/in/member-role.use-case.port';
import { MemberSearchUseCasePort } from '../../../application/ports/in/member-search.use-case.port';
import type { Request } from 'express';
import type { AdminTokenPayload } from 'src/security/domain/token-payload.types';
import { UpdateMemberByAdminReqDto } from '../dto/request/update-member-by-admin.req.dto';
import { RoleAssignmentReqDto } from '../dto/request/role-assignment.req.dto';
import { MemberAdminSearchQueryDto } from '../dto/request/member-admin-search.query.dto';
import { MemberRequestMapper } from './mappers/member.request.mapper';
import { MemberResponseMapper } from './mappers/member.response.mapper';
import {
  MemberDetailResDto,
  MemberSearchPaginatedResDto,
  MessageResDto,
} from '../dto/response';

@ApiTags('회원 관리 API (관리자)')
@ApiBearerAuth()
@Controller('member')
export class MemberAdminController {
  constructor(
    @Inject(MemberProfileUseCasePort)
    private readonly memberProfileUseCase: MemberProfileUseCasePort,
    @Inject(MemberRoleUseCasePort)
    private readonly memberRoleUseCase: MemberRoleUseCasePort,
    @Inject(MemberSearchUseCasePort)
    private readonly memberSearchUseCase: MemberSearchUseCasePort,
  ) {}

  @Patch('roleAssignment/:memberId')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '회원 권한 할당',
    description: '특정 회원에게 권한을 할당합니다. (관리자 전용)',
  })
  @ApiParam({ name: 'memberId', description: '권한을 할당할 회원의 ID' })
  @ApiBody({ type: RoleAssignmentReqDto })
  @ApiResponse({
    status: 200,
    description: '회원 권한 할당 성공',
    type: MessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '회원을 찾을 수 없음' })
  async assignRole(
    @Param(
      'memberId',
      new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    memberId: number,
    @Body() roleAssignmentDto: RoleAssignmentReqDto,
  ) {
    const { roles } =
      MemberRequestMapper.toRoleAssignmentParams(roleAssignmentDto);
    return this.memberRoleUseCase.assignRole(memberId, roles);
  }

  @Patch('admin/:memberId')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '회원 정보 수정 (관리자)',
    description:
      '관리자가 특정 회원의 이름·닉네임·소속 동아리·로그인 이메일을 수정합니다. (프로필 이미지·SNS URL은 회원 본인 수정 API 사용) 동아리 또는 이메일이 실제로 바뀌는 경우 현재 관리자의 비밀번호(adminPassword)가 필요합니다.',
  })
  @ApiParam({ name: 'memberId', description: '수정할 회원의 ID' })
  @ApiBody({ type: UpdateMemberByAdminReqDto })
  @ApiResponse({
    status: 200,
    description: '회원 정보 수정 성공',
    type: MemberDetailResDto,
  })
  @ApiResponse({
    status: 400,
    description: '요청 본문 검증 실패 또는 변경 없음',
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패 또는 관리자 비밀번호 불일치',
  })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '회원 또는 동아리를 찾을 수 없음' })
  @ApiResponse({
    status: 409,
    description: '이미 사용 중인 이메일',
  })
  async updateMemberByAdmin(
    @Req() req: Request & { admin: AdminTokenPayload },
    @Param(
      'memberId',
      new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    memberId: number,
    @Body() body: UpdateMemberByAdminReqDto,
  ) {
    const params = MemberRequestMapper.toUpdateMemberByAdminParams(body);
    const entity = await this.memberProfileUseCase.updateMemberByAdmin(
      req.admin.adminId,
      memberId,
      params,
    );
    return MemberResponseMapper.toDetailDto(entity);
  }

  @Get('search-user')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '회원 검색 (페이지네이션)',
    description:
      '회원을 검색합니다. page(0-based), pageSize(20|40|80) 지원. React Query pagination 호환.',
  })
  @ApiResponse({
    status: 200,
    description: '회원 검색 성공',
    type: MemberSearchPaginatedResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async searchMembers(@Query() query: MemberAdminSearchQueryDto) {
    const params = MemberRequestMapper.toMemberSearchPaginatedParams({
      username: query.username,
      clubId: query.clubId,
      role: query.role,
      page: query.page,
      pageSize: query.pageSize,
    });
    const result = await this.memberSearchUseCase.searchMembers(params);
    return {
      totalCount: result.totalCount,
      totalPages: result.totalPages,
      page: result.page,
      pageSize: result.pageSize,
      members: result.members.map((m) => MemberResponseMapper.toListItemDto(m)),
    };
  }
}
