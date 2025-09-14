import {
  Controller,
  Get,
  UseGuards,
  Req,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import {
  AdminAccessGuard,
  AdminRoleGuard,
} from 'src/security/presentation/guards';
import { AdminRole } from 'src/security/presentation/decorators';
import { ClubAdminService } from '../services/club-admin.service';
import { ClubResponseMapper } from './mappers/club.response.mapper';
import { ClubControllerRequestMapper } from './mappers/club.request.mapper';
import { UpdateClubProfileReqDto } from '../dto/request/update-club-profile.req.dto';
import { UpdateClubPrimaryMembersReqDto } from '../dto/request/update-club-primary-members.req.dto';
import {
  ClubInfoResDto,
  ClubMemberItemResDto,
  ClubPrimaryMemberItemResDto,
  ClubSimpleMessageResDto,
} from '../dto/response';
import { ClubInfoListResDto } from '../dto/response/club-info.res.dto';

@ApiTags('동아리 API')
@ApiBearerAuth()
@Controller('club')
export class ClubAdminController {
  constructor(private readonly clubAdminService: ClubAdminService) {}

  @Get('sub/club-profile')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: 'SUB 관리자용 동아리 프로필 조회',
    description: 'SUB 관리자 권한으로 모든 동아리의 프로필을 조회합니다.',
  })
  @ApiBearerAuth()
  @AdminRole(['SUB'])
  @ApiResponse({
    status: 200,
    description: '동아리 프로필 조회 성공',
    type: ClubInfoResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getClubProfileForSubAdmin(@Req() req: Request) {
    const { clubId } = req.admin;
    const entity = await this.clubAdminService.getClubInfo(+clubId);
    return ClubResponseMapper.toClubInfoDto(entity);
  }

  @Patch('sub/club-profile')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '동아리 정보 업데이트 (프로필 이미지, 역할 할당)',
    description: '동아리 프로필 이미지와 역할 할당을 업데이트합니다.',
  })
  @ApiBearerAuth()
  @AdminRole(['SUB'])
  @ApiBody({ type: UpdateClubProfileReqDto })
  @ApiResponse({
    status: 200,
    description: '동아리 정보 업데이트 성공',
    type: ClubSimpleMessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async updateClubProfileBySubAdmin(
    @Req() req: Request,
    @Body() body: UpdateClubProfileReqDto,
  ) {
    const { clubId } = req.admin;
    await this.clubAdminService.updateClubProfile(
      clubId,
      ClubControllerRequestMapper.toUpdateClubProfileCommand(body),
    );

    return { message: '동아리 정보 업데이트 성공' };
  }

  @Get('sub/members')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '동아리 멤버 조회',
    description: '현재 로그인한 사용자의 동아리 멤버 목록을 조회합니다.',
  })
  @ApiBearerAuth()
  @AdminRole('SUB')
  @ApiResponse({
    status: 200,
    description: '동아리 멤버 조회 성공',
    type: [ClubMemberItemResDto],
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getMyClubMembersBySubAdmin(@Req() req: Request) {
    const { clubId } = req.admin;
    const members = await this.clubAdminService.getClubMembers(+clubId);
    return ClubResponseMapper.toClubMembersDto(members);
  }

  @Get(':clubId/members')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '동아리 멤버 조회',
    description: '선택한 동아리의 멤버 목록을 조회합니다.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: '동아리 멤버 조회 성공',
    type: [ClubMemberItemResDto],
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getClubMembersByClubId(@Param('clubId', ParseIntPipe) clubId: number) {
    const members = await this.clubAdminService.getClubMembers(clubId);
    return ClubResponseMapper.toClubMembersDto(members);
  }

  @Get('sub/primary-members')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '동아리 주요 활동 멤버 조회 (관리자)',
    description: '관리자 권한으로 특정 동아리 주요 활동 멤버를 조회합니다.',
  })
  @ApiBearerAuth()
  @AdminRole('SUB')
  @ApiResponse({
    status: 200,
    description: '동아리 주요 활동 멤버 조회 성공',
    type: [ClubPrimaryMemberItemResDto],
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getClubPrimaryMembersBySubAdmin(@Req() req: Request) {
    const { clubId } = req.admin;
    const primaryMembers =
      await this.clubAdminService.getClubPrimaryMembers(clubId);
    return ClubResponseMapper.toClubPrimaryMembersDto(primaryMembers);
  }

  @Get(':clubId/primary-members')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '동아리 주요 활동 멤버 조회 (관리자)',
    description: '관리자 권한으로 특정 동아리 주요 활동 멤버를 조회합니다.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: '동아리 주요 활동 멤버 조회 성공',
    type: [ClubPrimaryMemberItemResDto],
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getClubPrimaryMembersByAdmin(
    @Param('clubId', ParseIntPipe) clubId: number,
  ) {
    const primaryMembers =
      await this.clubAdminService.getClubPrimaryMembers(clubId);
    return ClubResponseMapper.toClubPrimaryMembersDto(primaryMembers);
  }

  @Get('club-profiles')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '동아리 프로필 조회',
    description: '관리자 권한으로 모든 동아리의 프로필을 조회합니다.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: '동아리 프로필 조회 성공',
    type: [ClubInfoListResDto],
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getAllClubProfiles() {
    const entities = await this.clubAdminService.getAllClubInfo();
    return ClubResponseMapper.toClubInfoListDto(entities);
  }

  @Patch('sub/primary-members')
  @UseGuards(AdminAccessGuard, AdminRoleGuard)
  @AdminRole('SUB')
  @ApiOperation({
    summary: '동아리 주요 활동 멤버 업데이트',
    description: 'SUB 관리자 권한으로 동아리 주요 활동 멤버를 업데이트합니다.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateClubPrimaryMembersReqDto })
  @ApiResponse({
    status: 200,
    description: '동아리 주요 활동 멤버 업데이트 성공',
    type: ClubSimpleMessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: 'SUB 관리자 권한 필요' })
  async updateClubPrimaryMembersBySubAdmin(
    @Req() req: Request,
    @Body() body: UpdateClubPrimaryMembersReqDto,
  ) {
    const { clubId } = req.admin;
    await this.clubAdminService.updateClubPrimaryMembers(
      clubId,
      body.memberIds,
    );

    return { message: '동아리 주요 활동 멤버 업데이트 성공' };
  }

  @Patch(':clubId/primary-members')
  @UseGuards(AdminAccessGuard, AdminRoleGuard)
  @AdminRole(['SUPER', 'SUB'])
  @ApiOperation({
    summary: '동아리 주요 활동 멤버 업데이트',
    description: 'SUB 관리자 권한으로 동아리 주요 활동 멤버를 업데이트합니다.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateClubPrimaryMembersReqDto })
  @ApiResponse({
    status: 200,
    description: '동아리 주요 활동 멤버 업데이트 성공',
    type: ClubSimpleMessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: 'SUB 관리자 권한 필요' })
  async updateClubPrimaryMembers(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Body() body: UpdateClubPrimaryMembersReqDto,
  ) {
    await this.clubAdminService.updateClubPrimaryMembers(
      clubId,
      body.memberIds,
    );

    return { message: '동아리 주요 활동 멤버 업데이트 성공' };
  }

  @Patch(':clubId/profile')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '동아리 정보 업데이트 (프로필 이미지, 역할 할당)',
    description: '동아리 프로필 이미지와 역할 할당을 업데이트합니다.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateClubProfileReqDto })
  @ApiResponse({
    status: 200,
    description: '동아리 정보 업데이트 성공',
    type: ClubSimpleMessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async updateClubProfile(
    @Param('clubId', ParseIntPipe) clubId: number,
    @Body() body: UpdateClubProfileReqDto,
  ) {
    await this.clubAdminService.updateClubProfile(
      clubId,
      ClubControllerRequestMapper.toUpdateClubProfileCommand(body),
    );

    return { message: '동아리 정보 업데이트 성공' };
  }
}
