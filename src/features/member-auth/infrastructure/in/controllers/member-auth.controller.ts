import {
  Body,
  Controller,
  Delete,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserAccessGuard } from 'src/security/presentation/guards/user-access.guard';
import { VerifiedTokenGuard } from 'src/security/presentation/guards/verified-token.guard';
import type { MemberTokenPayload } from 'src/security/domain';
import { MemberAuthUseCasePort } from '../../../application/ports/in/member-auth.use-case.port';
import { Inject } from '@nestjs/common';
import { CheckEmailReqDto } from '../dto/request/check-email.req.dto';
import { SignupReqDto } from '../dto/request/signup.req.dto';
import { LoginReqDto } from '../dto/request/login.req.dto';
import { RefreshTokensReqDto } from '../dto/request/refresh-tokens.req.dto';
import { LogoutReqDto } from '../dto/request/logout.req.dto';
import { ChangePasswordReqDto } from '../dto/request/change-password.req.dto';
import { ResetPasswordReqDto } from '../dto/request/reset-password.req.dto';
import { DeleteAccountReqDto } from '../dto/request/delete-account.req.dto';
import { ExternalDeleteAccountReqDto } from '../dto/request/external-delete-account.req.dto';
import { CheckEmailResDto } from '../dto/response/check-email.res.dto';
import { TokenResDto } from '../dto/response/token.res.dto';
import { MessageResDto } from '../dto/response/message.res.dto';
import { MemberAuthControllerRequestMapper } from './mappers/member-auth-controller.request.mapper';
import { MemberAuthControllerResponseMapper } from './mappers/member-auth-controller.response.mapper';

@ApiTags('회원 인증 API')
@Controller('auth')
export class MemberAuthController {
  constructor(
    @Inject(MemberAuthUseCasePort)
    private readonly memberAuthUseCase: MemberAuthUseCasePort,
  ) {}

  @Post('check-email')
  @ApiOperation({
    summary: '이메일 중복 확인',
    description: '이미 등록된 이메일인지 확인합니다.',
  })
  @ApiBody({ type: CheckEmailReqDto })
  @ApiResponse({
    status: 200,
    description: '이메일 확인 성공',
    type: CheckEmailResDto,
  })
  async checkEmail(@Body() dto: CheckEmailReqDto): Promise<CheckEmailResDto> {
    const email = MemberAuthControllerRequestMapper.toCheckEmail(dto);
    const result = await this.memberAuthUseCase.checkEmail(email);
    return MemberAuthControllerResponseMapper.toCheckEmailResDto(result);
  }

  @Post('signup')
  @ApiOperation({
    summary: '회원가입 요청',
    description: '새로운 사용자의 회원가입을 요청합니다.',
  })
  @ApiBody({ type: SignupReqDto })
  @ApiResponse({
    status: 201,
    description: '회원가입 요청 성공',
    type: MessageResDto,
  })
  async signup(@Body() dto: SignupReqDto): Promise<MessageResDto> {
    const params = MemberAuthControllerRequestMapper.toSignupParams(dto);
    const result = await this.memberAuthUseCase.signup(params);
    return MemberAuthControllerResponseMapper.toMessageResDto(result);
  }

  @Post('login')
  @ApiOperation({
    summary: '로그인',
    description: '이메일과 비밀번호로 로그인합니다.',
  })
  @ApiBody({ type: LoginReqDto })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    type: TokenResDto,
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(
    @Body() dto: LoginReqDto,
    @Req() req: Request,
  ): Promise<TokenResDto> {
    const params = MemberAuthControllerRequestMapper.toLoginParams(dto, req);
    const result = await this.memberAuthUseCase.login(params);
    return MemberAuthControllerResponseMapper.toTokenResDto(result);
  }

  @Post('refresh')
  @ApiOperation({
    summary: '토큰 갱신',
    description: '리프레시 토큰으로 액세스·리프레시 토큰을 교체 발급합니다.',
  })
  @ApiBody({ type: RefreshTokensReqDto })
  @ApiResponse({
    status: 200,
    description: '갱신 성공',
    type: TokenResDto,
  })
  @ApiResponse({ status: 401, description: '갱신 실패' })
  async refreshTokens(
    @Body() dto: RefreshTokensReqDto,
    @Req() req: Request,
  ): Promise<TokenResDto> {
    const params = MemberAuthControllerRequestMapper.toRefreshParams(dto, req);
    const result = await this.memberAuthUseCase.refreshTokens(params);
    return MemberAuthControllerResponseMapper.toTokenResDto(result);
  }

  @Post('logout')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '로그아웃',
    description:
      '세션 기준 리프레시 토큰을 폐기합니다. refreshToken·deviceId·액세스 토큰 sid 조합으로 범위를 좁힐 수 있습니다.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: LogoutReqDto, required: false })
  @ApiResponse({
    status: 200,
    description: '로그아웃 성공',
    type: MessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async logout(
    @Req() req: Request,
    @Body() dto: LogoutReqDto,
  ): Promise<MessageResDto> {
    const user = req.user as MemberTokenPayload;
    const logoutParams = MemberAuthControllerRequestMapper.toLogoutParams(
      dto,
      typeof user.sid === 'string' ? user.sid : undefined,
    );
    const result = await this.memberAuthUseCase.logout(
      user.memberId,
      logoutParams,
    );
    return MemberAuthControllerResponseMapper.toMessageResDto(result);
  }

  @Patch('changePW')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '비밀번호 변경',
    description: '현재 로그인된 사용자의 비밀번호를 변경합니다.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: ChangePasswordReqDto })
  @ApiResponse({
    status: 200,
    description: '비밀번호 변경 성공',
    type: MessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async changePassword(
    @Body() dto: ChangePasswordReqDto,
    @Req() req: Request,
  ): Promise<MessageResDto> {
    const memberId = MemberAuthController.normalizeMemberIdFromUser(req.user);
    const params = MemberAuthControllerRequestMapper.toChangePasswordParams(
      memberId,
      dto,
    );
    const result = await this.memberAuthUseCase.changePassword(params);
    return MemberAuthControllerResponseMapper.toMessageResDto(result);
  }

  @Patch('resetPW')
  @UseGuards(VerifiedTokenGuard)
  @ApiOperation({
    summary: '비밀번호 재설정',
    description: '이메일 인증 후 비밀번호를 재설정합니다.',
  })
  @ApiBody({ type: ResetPasswordReqDto })
  @ApiResponse({
    status: 200,
    description: '비밀번호 재설정 성공',
    type: MessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async resetPassword(
    @Body() dto: ResetPasswordReqDto,
    @Req() req: Request,
  ): Promise<MessageResDto> {
    const { verifiedEmail } = req.verificationToken as {
      verifiedEmail: string;
    };
    const params = MemberAuthControllerRequestMapper.toResetPasswordParams(
      verifiedEmail,
      dto,
    );
    const result = await this.memberAuthUseCase.resetPassword(params);
    return MemberAuthControllerResponseMapper.toMessageResDto(result);
  }

  @Delete('')
  @UseGuards(UserAccessGuard)
  @ApiOperation({
    summary: '회원 탈퇴',
    description: '현재 로그인된 사용자의 계정을 삭제합니다.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: DeleteAccountReqDto })
  @ApiResponse({
    status: 200,
    description: '회원 탈퇴 성공',
    type: MessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
  async remove(
    @Req() req: Request,
    @Body() dto: DeleteAccountReqDto,
  ): Promise<MessageResDto> {
    const memberId = MemberAuthController.normalizeMemberIdFromUser(req.user);
    const result = await this.memberAuthUseCase.remove(memberId, dto.password);
    return MemberAuthControllerResponseMapper.toMessageResDto(result);
  }

  @Delete('external')
  @ApiOperation({
    summary: '외부 인증 삭제',
    description: '외부에서 인증하여 계정을 삭제합니다.',
  })
  @ApiBody({ type: ExternalDeleteAccountReqDto })
  @ApiResponse({
    status: 200,
    description: '외부 인증 삭제 성공',
    type: MessageResDto,
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async externalRemove(
    @Body() dto: ExternalDeleteAccountReqDto,
  ): Promise<MessageResDto> {
    const params =
      MemberAuthControllerRequestMapper.toExternalRemoveParams(dto);
    const result = await this.memberAuthUseCase.externalRemove(params);
    return MemberAuthControllerResponseMapper.toMessageResDto(result);
  }

  private static normalizeMemberIdFromUser(
    user: MemberTokenPayload | undefined,
  ): number {
    const raw = user?.memberId;
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === 'string') {
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    throw new UnauthorizedException('Invalid member token');
  }
}
