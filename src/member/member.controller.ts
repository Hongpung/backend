import { Controller, Get, Body, Param, Delete, Put, Patch, UseGuards, Req, Query } from '@nestjs/common';
import { MemberService } from './member.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { Request } from 'express';
import { AdminGuard } from 'src/guards/admin.guard';
import { RoleAssignmentDto } from './dto/roleAssignment.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('회원 API')
@ApiBearerAuth()
@Controller('member')
export class MemberController {
  constructor(private readonly memberService: MemberService) { }

  //로그인 시 fetch
  @Patch('NToken')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '푸시 알림 토큰 업데이트', description: '회원의 푸시 알림 토큰을 업데이트합니다.' })
  @ApiResponse({ status: 200, description: '푸시 알림 토큰 업데이트 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async upsertMemberNotificationToken(@Body() memberDto: { pushEnable: boolean, notificationToken?: string }, @Req() req: Request) {
    const { memberId } = req.user
    console.log(memberDto)
    return await this.memberService.updatePushEnable({ memberId: +memberId, ...memberDto });
  }

  //로그아웃 시 fetch
  @Delete('NToken')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '푸시 알림 토큰 삭제', description: '회원의 푸시 알림 토큰을 삭제합니다.' })
  @ApiResponse({ status: 200, description: '푸시 알림 토큰 삭제 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async deleteMemberNotificationToken(@Req() req: Request) {
    const { memberId } = req.user
    console.log('User:' + memberId + 'has delete their Token')
    return await this.memberService.deleteNotificationToken(+memberId);
  }

  //내정보보
  @Get('my-status')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '회원 상세 조회', description: '회원의 상세 정보를 조회합니다.' })
  @ApiResponse({ status: 200, description: '회원 상세 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async fetchUserData(@Req() req: Request) {
    const { memberId: id } = req.user
    return await this.memberService.findOneInformation(+id);
  }

  @Patch('my-status')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '회원 정보 수정', description: '회원의 정보를 수정합니다.' })
  @ApiResponse({ status: 200, description: '회원 정보 수정 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '회원을 찾을 수 없음' })
  async updateUserInfo(
    @Body() InformationData: { profileImageUrl?: string | null, nickname?: string | null, instagramUrl?: string | null, blogUrl?: string | null },
    @Req() req: Request) {
    const { memberId } = req.user
    console.log({ memberId, ...InformationData })
    return await this.memberService.updateUserInfo({ memberId: +memberId, ...InformationData });
  }

  @Patch('roleAssignment/:memberId')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '회원 권한 할당', description: '특정 회원에게 권한을 할당합니다.' })
  @ApiParam({ name: 'memberId', description: '권한을 할당할 회원의 ID' })
  @ApiResponse({ status: 200, description: '회원 권한 할당 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  @ApiResponse({ status: 404, description: '회원을 찾을 수 없음' })
  async assignRole(@Param('memberId') memberId: string, @Body() roleAssignmentDto: RoleAssignmentDto) {
    return await this.memberService.assignRole(+memberId, roleAssignmentDto);
  }

  @Get('search-user')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '회원 검색', description: '회원을 검색합니다.' })
  @ApiResponse({ status: 200, description: '회원 검색 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async findUser(
    @Query('username') username?: string,
    @Query('clubId') clubId?: string,
    @Query('role') role?: string,
  ) {
    return await this.memberService.adminFindUserByOption({ username, clubId, role })
  }

  @Get('search-user-page')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '회원 페이지 검색', description: '회원을 페이지 검색합니다.' })
  @ApiResponse({ status: 200, description: '회원 페이지 검색 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async findUserUsingPage(
    @Query('username') username?: string,
    @Query('clubId') clubId?: string,
    @Query('role') role?: string,
    @Query('page') page?: string
  ) {
    return await this.memberService.adminFindUserByOptionUsingPage({ username, clubId, role, page: +page })
  }

  @Get('invite-possible')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '초대 가능한 회원 조회', description: '초대 가능한 회원을 조회합니다.' })
  @ApiResponse({ status: 200, description: '초대 가능한 회원 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async fetchInvitePossibleUsers(@Req() req: Request,
    @Query('username') username?: string,
    @Query('clubId') clubId?: string | string[], // 여러 개 받기
    @Query('minEnrollmentNumber') minEnrollmentNumber?: string,
    @Query('maxEnrollmentNumber') maxEnrollmentNumber?: string,
  ) {
    const { memberId } = req.user;

    const clubIds: number[] = Array.isArray(clubId) ? clubId.map(club => +club) : clubId ? [+clubId] : [];

    return await this.memberService.invitePossibleList(memberId, { username, clubIds, minEnrollmentNumber, maxEnrollmentNumber })
  }
}
