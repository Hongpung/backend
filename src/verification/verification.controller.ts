import { Body, Controller, Get, HttpException, HttpStatus, Post, Headers, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { EmailDto, VerifyEmailDto } from './dto/email.dto'
import { AuthGuard } from 'src/guards/auth.guard';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('검증 API')
@ApiBearerAuth()
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) { }

  @Post('send/id')
  @ApiOperation({ summary: '이메일 인증 코드 발송', description: '이메일 인증 코드를 발송합니다.' })
  @ApiResponse({ status: 200, description: '인증 코드 발송 성공' })
  @ApiResponse({ status: 403, description: '최대 인증 시도 횟수 초과' })
  async sendEmailVerificationCode(@Body() EmailDto: EmailDto) {
    try {
      console.log(EmailDto)
      await this.verificationService.sendEmailVerificationCode(EmailDto);
      return { message: 'Verification code sent successfully' };
    } catch (e) {
      if (e instanceof Error)
        if (e.message == 'Maximum verification attempts reached') throw new HttpException('Maximum verification attempts reached', HttpStatus.FORBIDDEN);
    }
  }

  @Post('verify/id')
  @ApiOperation({ summary: '이메일 인증 코드 검증', description: '이메일 인증 코드를 검증합니다.' })
  @ApiResponse({ status: 200, description: '인증 코드 검증 성공' })
  @ApiResponse({ status: 400, description: '잘못된 인증 코드' })
  @ApiResponse({ status: 401, description: '만료된 인증 코드' })
  async verifyEmailVerificationCode(@Body() VerifyEmailDto: VerifyEmailDto) {
    try {
      console.log(VerifyEmailDto)
      const response = await this.verificationService.verifyEmailVerificationCodeMethod(VerifyEmailDto);
      console.log(response)
      return response;
    } catch (e) {
      console.error(e)
      if (e instanceof Error) {
        if (e.message == 'Incorrect Code') throw new HttpException('Incorrect code', HttpStatus.BAD_REQUEST);
        else if (e.message == 'Exfired Code') throw new HttpException('Verification code has expired', HttpStatus.UNAUTHORIZED);
      }
    }
  }

  @Post('send/password')
  @ApiOperation({ summary: '비밀번호 재설정 인증 코드 발송', description: '비밀번호 재설정을 위한 인증 코드를 발송합니다.' })
  @ApiResponse({ status: 200, description: '인증 코드 발송 성공' })
  @ApiResponse({ status: 403, description: '최대 인증 시도 횟수 초과' })
  async sendPasswordVerificationCode(@Body() EmailDto: EmailDto) {
    try {
      console.log(EmailDto)
      await this.verificationService.sendPasswordVerificationCode(EmailDto)
      return { message: 'Verification code sent successfully' };
    } catch (e) {
      if (e instanceof Error)
        if (e.message == 'Maximum verification attempts reached') throw new HttpException('Maximum verification attempts reached', HttpStatus.FORBIDDEN);
    }
  }

  @Post('verify/password')
  @ApiOperation({ summary: '비밀번호 재설정 인증 코드 검증', description: '비밀번호 재설정을 위한 인증 코드를 검증합니다.' })
  @ApiResponse({ status: 200, description: '인증 코드 검증 성공' })
  @ApiResponse({ status: 400, description: '잘못된 인증 코드' })
  @ApiResponse({ status: 401, description: '만료된 인증 코드' })
  async verfyPasswordVerificationCode(@Body() VerifyEmailDto: VerifyEmailDto) {
    try {
      console.log(VerifyEmailDto)
      await this.verificationService.verifyPasswordVerificationCode(VerifyEmailDto);
      const token = await this.verificationService.issueVerficationToken(VerifyEmailDto)
      return { message: 'Verification code sent successfully', token };
    } catch (e) {
      if (e instanceof Error)
        if (e.message == 'Incorrect Code') throw new HttpException('Incorrect code', HttpStatus.BAD_REQUEST);
        else if (e.message == 'Exfired Code') throw new HttpException('Verification code has expired', HttpStatus.UNAUTHORIZED);
    }
  }
}
