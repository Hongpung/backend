import type { Request } from 'express';
import { getMetricsClientIp } from 'src/infrastructure/metrics/metrics-client-ip';
import type { MemberAuthUseCasePort } from '../../../../application/ports/in/member-auth.use-case.port';
import type { CheckEmailReqDto } from '../../dto/request/check-email.req.dto';
import type { SignupReqDto } from '../../dto/request/signup.req.dto';
import type { LoginReqDto } from '../../dto/request/login.req.dto';
import type { RefreshTokensReqDto } from '../../dto/request/refresh-tokens.req.dto';
import type { LogoutReqDto } from '../../dto/request/logout.req.dto';
import type { ChangePasswordReqDto } from '../../dto/request/change-password.req.dto';
import type { ResetPasswordReqDto } from '../../dto/request/reset-password.req.dto';
import type { ExternalDeleteAccountReqDto } from '../../dto/request/external-delete-account.req.dto';

type SignupInput = Parameters<MemberAuthUseCasePort['signup']>[0];
type LoginInput = Parameters<MemberAuthUseCasePort['login']>[0];
type RefreshInput = Parameters<MemberAuthUseCasePort['refreshTokens']>[0];
type LogoutInput = NonNullable<Parameters<MemberAuthUseCasePort['logout']>[1]>;
type ChangePasswordInput = Parameters<
  MemberAuthUseCasePort['changePassword']
>[0];
type ResetPasswordInput = Parameters<MemberAuthUseCasePort['resetPassword']>[0];
type ExternalRemoveInput = Parameters<
  MemberAuthUseCasePort['externalRemove']
>[0];

export class MemberAuthControllerRequestMapper {
  static toCheckEmail(dto: CheckEmailReqDto): string {
    return dto.email;
  }

  static toSignupParams(dto: SignupReqDto): SignupInput {
    return {
      email: dto.email,
      password: dto.password,
      name: dto.name,
      enrollmentNumber: dto.enrollmentNumber,
      clubId: dto.clubId ?? null,
      nickname: dto.nickname ?? null,
    };
  }

  static toLoginParams(dto: LoginReqDto, req: Request): LoginInput {
    const ua = req.headers['user-agent'];
    return {
      email: dto.email,
      password: dto.password,
      deviceId: dto.deviceId,
      deviceName: dto.deviceName ?? null,
      rememberMe: dto.rememberMe,
      autoLogin: dto.autoLogin,
      userAgent: typeof ua === 'string' ? ua : null,
      ipAddress: getMetricsClientIp(req) || null,
    };
  }

  static toRefreshParams(dto: RefreshTokensReqDto, req: Request): RefreshInput {
    const ua = req.headers['user-agent'];
    return {
      refreshToken: dto.refreshToken,
      deviceId: dto.deviceId,
      deviceName: dto.deviceName ?? null,
      userAgent: typeof ua === 'string' ? ua : null,
      ipAddress: getMetricsClientIp(req) || null,
    };
  }

  static toLogoutParams(
    dto: LogoutReqDto | undefined,
    sessionIdFromAccessToken?: string,
  ): LogoutInput {
    return {
      refreshToken: dto?.refreshToken,
      sessionId: sessionIdFromAccessToken,
      deviceId: dto?.deviceId,
      clearPushTokens: dto?.clearPushTokens,
    };
  }

  static toChangePasswordParams(
    memberId: number,
    dto: ChangePasswordReqDto,
  ): ChangePasswordInput {
    return {
      memberId,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    };
  }

  static toResetPasswordParams(
    verifiedEmail: string,
    dto: ResetPasswordReqDto,
  ): ResetPasswordInput {
    return {
      email: verifiedEmail,
      newPassword: dto.newPassword,
    };
  }

  static toExternalRemoveParams(
    dto: ExternalDeleteAccountReqDto,
  ): ExternalRemoveInput {
    return {
      email: dto.email,
      password: dto.password,
    };
  }
}
