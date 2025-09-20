import type { SendVerificationCodeReqDto } from '../../dto/request/send-verification-code.req.dto';
import type { VerifyVerificationCodeReqDto } from '../../dto/request/verify-verification-code.req.dto';

export class MemberAuthVerificationControllerRequestMapper {
  static toEmail(dto: SendVerificationCodeReqDto): string {
    return dto.email;
  }

  static toVerifyCodeParams(dto: VerifyVerificationCodeReqDto): {
    email: string;
    code: string;
  } {
    return { email: dto.email, code: dto.code };
  }
}
