import {
  Controller,
  Get,
  Body,
  Param,
  Post,
  Delete,
  UseGuards,
  Inject,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AdminAccessGuard } from 'src/security/presentation/guards/admin-access.guard';
import { MemberAuthAdminUseCasePort } from '../../../application/ports/in/member-auth-admin.use-case.port';
import { AcceptSignupReqDto } from '../dto/request/accept-signup.req.dto';
import { ForceDeleteReqDto } from '../dto/request/force-delete.req.dto';
import { SignupListResDto } from '../dto/response/signup-list.res.dto';
import { MessageResDto } from '../dto/response/message.res.dto';
import { MemberAuthControllerResponseMapper } from './mappers/member-auth-controller.response.mapper';
import { MemberAuthAdminControllerRequestMapper } from './mappers/member-auth-admin-controller.request.mapper';
import { AdminRole } from 'src/security/presentation/decorators';

@ApiTags('회원 인증 API (관리자)')
@ApiBearerAuth()
@Controller('auth/admin')
export class MemberAuthAdminController {
  constructor(
    @Inject(MemberAuthAdminUseCasePort)
    private readonly adminUseCase: MemberAuthAdminUseCasePort,
  ) {}

  @Get('signup/sub')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '승인 대기 계정 목록 조회',
    description: '승인을 기다리는 모든 계정 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '승인 대기 계정 목록 조회 성공',
    type: [SignupListResDto],
  })
  @AdminRole('SUB')
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async getPendingSignupListBySubAdmin(
    @Req() req: Request,
  ): Promise<SignupListResDto[]> {
    const { clubId } = req.admin;
    const items = await this.adminUseCase.getPendingSignupListByClubId(clubId);
    return MemberAuthControllerResponseMapper.toSignupListResDto(items);
  }

  @Get('signup')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '승인 대기 계정 목록 조회',
    description: '승인을 기다리는 모든 계정 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '승인 대기 계정 목록 조회 성공',
    type: [SignupListResDto],
  })
  @AdminRole('SUPER')
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async getPendingSignupList(): Promise<SignupListResDto[]> {
    const items = await this.adminUseCase.getPendingSignupList();
    return MemberAuthControllerResponseMapper.toSignupListResDto(items);
  }

  @Post('signup/accept')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '회원가입 승인',
    description: '선택된 회원가입 요청을 승인합니다.',
  })
  @ApiBody({ type: AcceptSignupReqDto })
  @ApiResponse({
    status: 200,
    description: '회원가입 승인 성공',
    type: MessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async acceptSignup(@Body() dto: AcceptSignupReqDto): Promise<MessageResDto> {
    const ids = MemberAuthAdminControllerRequestMapper.toAcceptedSignupIds(dto);
    const result = await this.adminUseCase.acceptSignUp(ids);
    return MemberAuthControllerResponseMapper.toMessageResDto(result);
  }

  @Post('signup/reject')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '회원가입 거절',
    description: '선택된 회원가입 요청을 거절합니다.',
  })
  @ApiBody({ type: AcceptSignupReqDto })
  @ApiResponse({
    status: 200,
    description: '회원가입 거절 성공',
    type: MessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async rejectSignup(@Body() dto: AcceptSignupReqDto): Promise<MessageResDto> {
    const ids = MemberAuthAdminControllerRequestMapper.toAcceptedSignupIds(dto);
    const result = await this.adminUseCase.rejectSignUp(ids);
    return MemberAuthControllerResponseMapper.toMessageResDto(result);
  }

  @Delete(':id')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '강제 회원 탈퇴',
    description: '관리자가 특정 사용자의 계정을 강제로 삭제합니다.',
  })
  @ApiParam({ name: 'id', description: '삭제할 사용자의 ID' })
  @ApiBody({ type: ForceDeleteReqDto })
  @ApiResponse({
    status: 200,
    description: '강제 회원 탈퇴 성공',
    type: MessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async forceRemove(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ForceDeleteReqDto,
    @Req() req: Request,
  ): Promise<MessageResDto> {
    const { adminId } = req.admin as { adminId: number };
    const params = MemberAuthAdminControllerRequestMapper.toForceRemoveParams(
      adminId,
      id,
      dto,
    );
    const result = await this.adminUseCase.forceRemove(params);
    return MemberAuthControllerResponseMapper.toMessageResDto(result);
  }
}
