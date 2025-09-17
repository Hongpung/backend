import { Body, Controller, Post, Req, UseGuards, Inject } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AdminAccessGuard } from 'src/security/presentation/guards/admin-access.guard';
import { AdminAuthUseCasePort } from '../../../application/ports/in/admin-auth.use-case.port';
import { AdminLoginReqDto } from '../dto/request/login.req.dto';
import { TokenResDto } from '../dto/response/token.res.dto';
import { AdminAuthControllerRequestMapper } from './mappers/admin-auth-controller.request.mapper';
import { AdminAuthControllerResponseMapper } from './mappers/admin-auth-controller.response.mapper';

@ApiTags('관리자 인증 API')
@Controller('auth/admin')
export class AdminAuthController {
  constructor(
    @Inject(AdminAuthUseCasePort)
    private readonly adminAuthUseCase: AdminAuthUseCasePort,
  ) {}

  @Post('login')
  @ApiOperation({
    summary: '관리자 로그인',
    description: '관리자 계정으로 로그인합니다.',
  })
  @ApiBody({ type: AdminLoginReqDto })
  @ApiResponse({
    status: 200,
    description: '관리자 로그인 성공',
    type: TokenResDto,
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async adminLogin(@Body() dto: AdminLoginReqDto): Promise<TokenResDto> {
    const { email, password } =
      AdminAuthControllerRequestMapper.toLoginParams(dto);
    const result = await this.adminAuthUseCase.adminLogin(email, password);
    return AdminAuthControllerResponseMapper.toTokenResDto(result);
  }

  @Post('extend-token')
  @UseGuards(AdminAccessGuard)
  @ApiOperation({
    summary: '관리자 토큰 연장',
    description: '관리자 토큰의 유효기간을 연장합니다.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: '토큰 연장 성공',
    type: TokenResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
  async adminExtendsToken(@Req() req: Request): Promise<TokenResDto> {
    const { adminId } = req.admin as { adminId: number };
    const result = await this.adminAuthUseCase.adminExtendToken(adminId);
    return AdminAuthControllerResponseMapper.toTokenResDto(result);
  }
}
