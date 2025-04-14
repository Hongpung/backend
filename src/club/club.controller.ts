import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ClubService } from './club.service';
import { AdminGuard } from 'src/guards/admin.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { Request } from 'express';

@ApiTags('동아리 API')
@ApiBearerAuth()
@Controller('club')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  @Get('my-club')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '내 동아리 정보 조회', description: '현재 로그인한 사용자의 동아리 정보를 조회합니다.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: '동아리 정보 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getClubInfo(@Req() req: Request) {
    const { clubId } = req.user
    return this.clubService.getUserClubInfo(clubId);
  }

  @Get('my-club/members')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '동아리 멤버 조회', description: '현재 로그인한 사용자의 동아리 멤버 목록을 조회합니다.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: '동아리 멤버 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async getClubMembers(@Req() req: Request) {
    const { clubId } = req.user
    return this.clubService.getUserClubMembers(clubId);
  }

  @Get('my-club/instruments')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: '동아리 악기 조회', description: '현재 로그인한 사용자의 동아리 소속 악기 목록을 조회합니다.' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: '동아리 악기 조회 성공' })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async findInstrumentsOfClub(@Req() req: Request) {
    const { clubId } = req.user;
    return await this.clubService.instrumentOfClub(+clubId);
  }
}