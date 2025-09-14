import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserAccessGuard } from 'src/security/presentation/guards/user-access.guard';
import { MemberClubId } from 'src/security/presentation/decorators';
import { ClubMemberService } from '../services/club-member.service';
import { ClubResponseMapper } from './mappers/club.response.mapper';
import {
  ClubInfoResDto,
  ClubMemberItemResDto,
  ClubPrimaryMemberItemResDto,
  ClubInstrumentItemResDto,
} from '../dto/response';

@ApiTags('동아리 API')
@ApiBearerAuth()
@Controller('club')
export class ClubMemberController {
  constructor(private readonly clubMemberService: ClubMemberService) {}

  @Get('my-club')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '내 동아리 정보 조회',
    description: '현재 로그인한 사용자의 동아리 정보를 조회합니다.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: '동아리 정보 조회 성공',
    type: ClubInfoResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getClubInfo(@Req() req: Request) {
    const { clubId } = req.user as { clubId: number };
    const entity = await this.clubMemberService.getClubInfo(+clubId);
    return ClubResponseMapper.toClubInfoDto(entity);
  }

  @Get('my-club/members')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '동아리 멤버 조회',
    description: '현재 로그인한 사용자의 동아리 멤버 목록을 조회합니다.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: '동아리 멤버 조회 성공',
    type: [ClubMemberItemResDto],
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getMyClubMembers(@Req() req: Request) {
    const { clubId } = req.user as { clubId: number };
    const members = await this.clubMemberService.getClubMembers(+clubId);
    return ClubResponseMapper.toClubMembersDto(members);
  }

  @Get('my-club/primary-members')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '동아리 주요 활동 멤버 조회',
    description:
      '현재 로그인한 사용자의 동아리 주요 활동 멤버(주체, 새내기)를 조회합니다.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: '동아리 주요 활동 멤버 조회 성공',
    type: [ClubPrimaryMemberItemResDto],
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getClubPrimaryMembers(@MemberClubId() clubId: number) {
    const primaryMembers =
      await this.clubMemberService.getClubPrimaryMembers(clubId);
    return ClubResponseMapper.toClubPrimaryMembersDto(primaryMembers);
  }

  @Get('my-club/instruments')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '동아리 악기 조회',
    description: '현재 로그인한 사용자의 동아리 소속 악기 목록을 조회합니다.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: '동아리 악기 조회 성공',
    type: [ClubInstrumentItemResDto],
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async findInstrumentsOfClub(@MemberClubId() clubId: number) {
    const instruments = await this.clubMemberService.getClubInstruments(clubId);
    return ClubResponseMapper.toClubInstrumentsDto(instruments);
  }
}
