import type { CheckEmailResDto } from '../../dto/response/check-email.res.dto';
import type { TokenResDto } from '../../dto/response/token.res.dto';
import type { MessageResDto } from '../../dto/response/message.res.dto';
import type { VerifyPasswordVerificationResDto } from '../../dto/response/verify-password-verification.res.dto';
import type { SignupListResDto } from '../../dto/response/signup-list.res.dto';
import type { SignupListItem } from '../../../../application/ports/in/member-auth-admin.use-case.port';

export class MemberAuthControllerResponseMapper {
  static toCheckEmailResDto(result: {
    isRegistered: boolean;
  }): CheckEmailResDto {
    return { isRegistered: result.isRegistered };
  }

  static toTokenResDto(result: {
    token: string;
    refreshToken: string;
  }): TokenResDto {
    return { token: result.token, refreshToken: result.refreshToken };
  }

  static toMessageResDto(result: { message: string }): MessageResDto {
    return { message: result.message };
  }

  static toVerifyPasswordVerificationResDto(result: {
    message: string;
    token: string;
  }): VerifyPasswordVerificationResDto {
    return { message: result.message, token: result.token };
  }

  static toSignupListResDto(items: SignupListItem[]): SignupListResDto[] {
    return items.map((item) => ({
      signupId: item.signupId,
      name: item.name,
      nickname: item.nickname,
      club: item.club,
      enrollmentNumber: item.enrollmentNumber,
      email: item.email,
    }));
  }
}
