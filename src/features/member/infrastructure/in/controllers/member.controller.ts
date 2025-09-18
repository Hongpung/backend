import {
  Controller,
  Get,
  Body,
  Patch,
  UseGuards,
  Query,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserAccessGuard } from 'src/security/presentation/guards/user-access.guard';
import { MemberProfileUseCasePort } from '../../../application/ports/in/member-profile.use-case.port';
import { MemberSearchUseCasePort } from '../../../application/ports/in/member-search.use-case.port';
import { UpdateMyStatusReqDto } from '../dto/request/update-my-status.req.dto';
import { MemberInviteSearchQueryDto } from '../dto/request/member-invite-search.query.dto';
import { MemberDetailResDto, MemberListItemResDto } from '../dto/response';
import { MemberRequestMapper } from './mappers/member.request.mapper';
import { MemberId } from 'src/security/presentation/decorators';
import { MemberResponseMapper } from './mappers/member.response.mapper';

@ApiTags('회원 API')
@ApiBearerAuth()
@Controller('member')
export class MemberController {
  constructor(
    @Inject(MemberProfileUseCasePort)
    private readonly memberProfileUseCase: MemberProfileUseCasePort,
    @Inject(MemberSearchUseCasePort)
    private readonly memberSearchUseCase: MemberSearchUseCasePort,
  ) {}

  @Get('my-status')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '회원 상세 조회',
    description: '회원의 상세 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '회원 상세 조회 성공',
    type: MemberDetailResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getMyStatus(@MemberId() memberId: number) {
    const member = await this.memberProfileUseCase.getMyStatus(memberId);
    return MemberResponseMapper.toDetailDto(member);
  }

  @Patch('my-status')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '회원 정보 수정',
    description: '회원의 정보를 수정합니다.',
  })
  @ApiBody({ type: UpdateMyStatusReqDto })
  @ApiResponse({
    status: 200,
    description: '회원 정보 수정 성공',
    type: MemberDetailResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '회원을 찾을 수 없음' })
  async updateMyStatus(
    @Body() body: UpdateMyStatusReqDto,
    @MemberId() memberId: number,
  ) {
    const params = MemberRequestMapper.toUpdateMemberProfileParams(body);
    const member = await this.memberProfileUseCase.updateMyStatus(
      memberId,
      params,
    );
    return MemberResponseMapper.toDetailDto(member);
  }

  @Get('invite-possible')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '초대 가능한 회원 조회',
    description: '초대 가능한 회원을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '초대 가능한 회원 조회 성공',
    type: [MemberListItemResDto],
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getInvitePossibleList(
    @MemberId() memberId: number,
    @Query() query: MemberInviteSearchQueryDto,
  ) {
    const { memberId: id, params } = MemberRequestMapper.toInviteSearchParams(
      memberId,
      {
        username: query.username,
        clubId: query.clubId,
        minEnrollmentNumber: query.minEnrollmentNumber,
        maxEnrollmentNumber: query.maxEnrollmentNumber,
      },
    );
    const members = await this.memberSearchUseCase.getInvitePossibleList(id, params);
    return members.map((member) => MemberResponseMapper.toListItemDto(member));
  }

  @Get('regular-participator-recommand')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '정기 참가자 추천',
    description: '정기 참가자를 추천합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '정기 참가자 추천 성공',
    type: [MemberListItemResDto],
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getRegularParticipatorRecommand(@MemberId() memberId: number) {
    const members = await this.memberSearchUseCase.getRegularParticipatorRecommand(
      memberId,
    );
    return members.map((member) => MemberResponseMapper.toListItemDto(member));
  }
}
