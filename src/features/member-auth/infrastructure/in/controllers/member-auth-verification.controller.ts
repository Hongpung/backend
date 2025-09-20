import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { MemberAuthVerificationUseCasePort } from '../../../application/ports/in/member-auth-verification.use-case.port';
import { SendVerificationCodeReqDto } from '../dto/request/send-verification-code.req.dto';
import { VerifyVerificationCodeReqDto } from '../dto/request/verify-verification-code.req.dto';
import { MemberAuthVerificationControllerRequestMapper } from './mappers/member-auth-verification-controller.request.mapper';
import { MemberAuthControllerResponseMapper } from './mappers/member-auth-controller.response.mapper';
import {
  MessageResDto,
  VerifyPasswordVerificationResDto,
} from '../dto/response';

@ApiTags('검증 API')
@Controller('verification')
export class MemberAuthVerificationController {
  constructor(
    @Inject(MemberAuthVerificationUseCasePort)
    private readonly verificationUseCase: MemberAuthVerificationUseCasePort,
  ) {}

  @Post('send/id')
  @ApiOperation({
    summary: '이메일 인증 코드 발송',
    description: '이메일 인증 코드를 발송합니다.',
  })
  @ApiBody({ type: SendVerificationCodeReqDto })
  @ApiResponse({
    status: 200,
    description: '인증 코드 발송 성공',
    type: MessageResDto,
  })
  @ApiResponse({ status: 403, description: '최대 인증 시도 횟수 초과' })
  async sendEmailVerificationCode(@Body() dto: SendVerificationCodeReqDto) {
    try {
      const email = MemberAuthVerificationControllerRequestMapper.toEmail(dto);
      await this.verificationUseCase.sendEmailVerificationCode(email);
      return { message: '인증 코드 발송이 완료되었습니다.' };
    } catch (e) {
      if (
        e instanceof Error &&
        e.message === '최대 인증 시도 횟수를 초과했습니다.'
      ) {
        throw new ForbiddenException('최대 인증 시도 횟수를 초과했습니다.');
      }
      throw e;
    }
  }

  @Post('verify/id')
  @ApiOperation({
    summary: '이메일 인증 코드 검증',
    description: '이메일 인증 코드를 검증합니다.',
  })
  @ApiBody({ type: VerifyVerificationCodeReqDto })
  @ApiResponse({
    status: 200,
    description: '인증 코드 검증 성공',
    type: MessageResDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 인증 코드' })
  @ApiResponse({ status: 401, description: '만료된 인증 코드' })
  async verifyEmailVerificationCode(@Body() dto: VerifyVerificationCodeReqDto) {
    const params =
      MemberAuthVerificationControllerRequestMapper.toVerifyCodeParams(dto);
    const result = await this.verifyVerificationCode(() =>
      this.verificationUseCase.verifyEmailVerificationCode(params),
    );
    return MemberAuthControllerResponseMapper.toMessageResDto(result);
  }

  @Post('send/password')
  @ApiOperation({
    summary: '비밀번호 재설정 인증 코드 발송',
    description: '비밀번호 재설정을 위한 인증 코드를 발송합니다.',
  })
  @ApiBody({ type: SendVerificationCodeReqDto })
  @ApiResponse({
    status: 200,
    description: '인증 코드 발송 성공',
    type: MessageResDto,
  })
  @ApiResponse({ status: 403, description: '최대 인증 시도 횟수 초과' })
  async sendPasswordVerificationCode(@Body() dto: SendVerificationCodeReqDto) {
    try {
      const email = MemberAuthVerificationControllerRequestMapper.toEmail(dto);
      await this.verificationUseCase.sendPasswordVerificationCode(email);
      return { message: '인증 코드 발송이 완료되었습니다.' };
    } catch (e) {
      if (
        e instanceof Error &&
        e.message === '최대 인증 시도 횟수를 초과했습니다.'
      ) {
        throw new ForbiddenException('최대 인증 시도 횟수를 초과했습니다.');
      }
      throw e;
    }
  }

  @Post('verify/password')
  @ApiOperation({
    summary: '비밀번호 재설정 인증 코드 검증',
    description: '비밀번호 재설정을 위한 인증 코드를 검증합니다.',
  })
  @ApiBody({ type: VerifyVerificationCodeReqDto })
  @ApiResponse({
    status: 200,
    description: '인증 코드 검증 성공',
    type: VerifyPasswordVerificationResDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 인증 코드' })
  @ApiResponse({ status: 401, description: '만료된 인증 코드' })
  async verifyPasswordVerificationCode(
    @Body() dto: VerifyVerificationCodeReqDto,
  ) {
    const params =
      MemberAuthVerificationControllerRequestMapper.toVerifyCodeParams(dto);
    const result = await this.verifyVerificationCode(async () => {
      const verifyResult =
        await this.verificationUseCase.verifyPasswordVerificationCode(params);
      const token = await this.verificationUseCase.issueVerificationToken(
        params.email,
      );
      return { ...verifyResult, token };
    });
    return MemberAuthControllerResponseMapper.toVerifyPasswordVerificationResDto(
      result,
    );
  }

  private async verifyVerificationCode<T extends { message: string }>(
    verify: () => Promise<T>,
  ): Promise<T> {
    try {
      return await verify();
    } catch (e) {
      if (e instanceof Error) {
        if (e.message === '인증 코드가 일치하지 않습니다.') {
          throw new BadRequestException('잘못된 인증 코드');
        }
        if (e.message === '인증 코드가 만료되었습니다.') {
          throw new UnauthorizedException('인증 코드가 만료되었습니다.');
        }
      }
      throw e;
    }
  }
}
