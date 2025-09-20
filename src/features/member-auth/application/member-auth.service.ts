import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { MemberAuthUseCasePort } from './ports/in/member-auth.use-case.port';
import {
  MemberAuthRepositoryPort,
  type IMemberAuthRepository,
} from './ports/out/member-auth.repository.port';
import {
  MemberAuthSessionRepositoryPort,
  type IMemberAuthSessionRepository,
} from './ports/out/member-auth-session.repository.port';
import {
  MemberAuthDomainEventsPublisherPort,
  type IMemberAuthDomainEventsPublisher,
} from './ports/out/member-auth-domain-events.publisher.port';
import { MemberAuthRefreshTokenHashSecretToken } from './tokens/member-auth-refresh-token-hash-secret.token';
import {
  generateOpaqueRefreshToken,
  hashRefreshToken,
} from '../domain/member-refresh-token-hash';
import { RefreshTokenRotationFailedError } from '../domain/member-refresh-token-rotation.error';
import {
  MemberAuthClearPushTokenPort,
  type IMemberAuthClearPushToken,
} from './ports/out/member-auth-clear-push-token.port';

const ACCESS_TOKEN_EXPIRES_IN = '15m';

@Injectable()
export class MemberAuthService implements MemberAuthUseCasePort {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(MemberAuthRepositoryPort)
    private readonly repository: IMemberAuthRepository,
    @Inject(MemberAuthSessionRepositoryPort)
    private readonly sessionRepository: IMemberAuthSessionRepository,
    @Inject(MemberAuthDomainEventsPublisherPort)
    private readonly domainEvents: IMemberAuthDomainEventsPublisher,
    @Inject(MemberAuthRefreshTokenHashSecretToken)
    private readonly refreshTokenHashSecret: string,
    @Inject(MemberAuthClearPushTokenPort)
    private readonly clearPushToken: IMemberAuthClearPushToken,
  ) {}

  private normalizeMemberId(memberId: unknown): number {
    if (typeof memberId === 'number' && Number.isFinite(memberId)) {
      return memberId;
    }
    if (typeof memberId === 'string') {
      const parsed = Number.parseInt(memberId, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    throw new UnauthorizedException('Invalid token');
  }

  private refreshExpiryDate(rememberMe: boolean): Date {
    return rememberMe
      ? dayjs().add(30, 'day').toDate()
      : dayjs().add(24, 'hour').toDate();
  }

  async checkEmail(email: string): Promise<{ isRegistered: boolean }> {
    const isRegistered = await this.repository.isRegisteredEmail(email);
    return { isRegistered };
  }

  async signup(params: {
    email: string;
    password: string;
    name: string;
    enrollmentNumber: string;
    clubId?: number | null;
    nickname?: string | null;
  }): Promise<{ message: string }> {
    const { email, password, name, enrollmentNumber, clubId, nickname } =
      params;

    if (clubId != null) {
      const club = await this.repository.findClubById(clubId);
      if (!club) throw new NotFoundException('invalid clubId');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.repository.signup({
      email,
      password: hashedPassword,
      name,
      enrollmentNumber,
      clubId,
      nickname,
    });

    return { message: 'SignUp Success' };
  }

  async login(params: {
    email: string;
    password: string;
    deviceId: string;
    deviceName?: string | null;
    rememberMe?: boolean;
    autoLogin?: boolean;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<{ token: string; refreshToken: string }> {
    const { email, password, deviceId, deviceName, userAgent, ipAddress } =
      params;

    const rememberMe = params.rememberMe ?? params.autoLogin ?? false;

    const authInfo = await this.repository.findAuthByEmail(email);
    if (!authInfo) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 일치하지 않습니다.');
    }

    const passwordMatchResult = await bcrypt.compare(
      password,
      authInfo.password,
    );
    if (!passwordMatchResult) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 일치하지 않습니다.');
    }

    const memberInfo = await this.repository.findMemberForLogin(
      authInfo.memberId,
    );
    if (!memberInfo) {
      throw new UnauthorizedException('존재하지 않는 유저입니다.');
    }

    if (!memberInfo.canLogin) {
      throw new ForbiddenException({
        message: "You're not accepted",
        errorCode: 'USER_NOT_APPROVED',
      });
    }

    const { isNewDevice } = await this.sessionRepository.upsertDeviceOnLogin({
      memberId: authInfo.memberId,
      deviceId,
      deviceName: deviceName ?? null,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });

    if (isNewDevice) {
      void this.domainEvents.publishNewDeviceLoginNotification({
        memberId: authInfo.memberId,
        deviceName: deviceName ?? null,
      });
    }

    const sessionId = uuidv4();
    const refreshPlain = generateOpaqueRefreshToken();
    const tokenHash = hashRefreshToken(
      refreshPlain,
      this.refreshTokenHashSecret,
    );
    const expiresAt = this.refreshExpiryDate(rememberMe);

    await this.sessionRepository.createRefreshToken({
      memberId: authInfo.memberId,
      sessionId,
      deviceId,
      tokenHash,
      rememberMe,
      deviceName: deviceName ?? null,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
      expiresAt,
    });

    const token = await this.jwtService.signAsync(
      authInfo.toJwtPayload({
        clubId: memberInfo.clubId,
        sid: sessionId,
      }),
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    );

    return { token, refreshToken: refreshPlain };
  }

  async refreshTokens(params: {
    refreshToken: string;
    deviceId: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    deviceName?: string | null;
  }): Promise<{ token: string; refreshToken: string }> {
    const { refreshToken, deviceId } = params;
    const tokenHash = hashRefreshToken(
      refreshToken,
      this.refreshTokenHashSecret,
    );
    const refreshTokenEntity =
      await this.sessionRepository.findRefreshTokenByHash(tokenHash);

    if (!refreshTokenEntity) {
      throw new UnauthorizedException('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    if (!refreshTokenEntity.matchesDevice(deviceId)) {
      throw new UnauthorizedException('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    if (refreshTokenEntity.isRevoked()) {
      await this.sessionRepository.revokeAllActiveTokensForSession({
        memberId: refreshTokenEntity.memberId,
        sessionId: refreshTokenEntity.sessionId,
      });
      this.domainEvents.publishRefreshTokenReused({
        memberId: refreshTokenEntity.memberId,
        sessionId: refreshTokenEntity.sessionId,
        deviceId: refreshTokenEntity.deviceId,
        detectedAt: new Date(),
      });
      throw new UnauthorizedException('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    if (refreshTokenEntity.isExpired()) {
      throw new UnauthorizedException('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    const memberInfo = await this.repository.findMemberForLogin(
      refreshTokenEntity.memberId,
    );
    if (!memberInfo?.canLogin) {
      throw new UnauthorizedException('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    const authInfo = await this.repository.findAuthByMemberId(
      refreshTokenEntity.memberId,
    );
    if (!authInfo) {
      throw new UnauthorizedException('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    const newRefreshPlain = generateOpaqueRefreshToken();
    const newHash = hashRefreshToken(
      newRefreshPlain,
      this.refreshTokenHashSecret,
    );
    const newExpiresAt = this.refreshExpiryDate(refreshTokenEntity.rememberMe);

    try {
      await this.sessionRepository.rotateRefreshToken({
        oldTokenId: refreshTokenEntity.id,
        memberId: refreshTokenEntity.memberId,
        sessionId: refreshTokenEntity.sessionId,
        deviceId: refreshTokenEntity.deviceId,
        rememberMe: refreshTokenEntity.rememberMe,
        deviceName: params.deviceName ?? undefined,
        userAgent: params.userAgent ?? undefined,
        ipAddress: params.ipAddress ?? undefined,
        newTokenHash: newHash,
        newExpiresAt,
      });
    } catch (error) {
      if (error instanceof RefreshTokenRotationFailedError) {
        await this.sessionRepository.revokeAllActiveTokensForSession({
          memberId: refreshTokenEntity.memberId,
          sessionId: refreshTokenEntity.sessionId,
        });
        this.domainEvents.publishRefreshTokenReused({
          memberId: refreshTokenEntity.memberId,
          sessionId: refreshTokenEntity.sessionId,
          deviceId: refreshTokenEntity.deviceId,
          detectedAt: new Date(),
        });
        throw new UnauthorizedException('인증이 만료되었습니다. 다시 로그인해주세요.');
      }
      throw error;
    }

    const token = await this.jwtService.signAsync(
      authInfo.toJwtPayload({
        clubId: memberInfo.clubId,
        sid: refreshTokenEntity.sessionId,
      }),
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    );

    return { token, refreshToken: newRefreshPlain };
  }

  async logout(
    memberIdRaw: unknown,
    params?: {
      refreshToken?: string;
      sessionId?: string;
      deviceId?: string;
      clearPushTokens?: boolean;
    },
  ): Promise<{ message: string }> {
    const memberId = this.normalizeMemberId(memberIdRaw);

    const refreshToken = params?.refreshToken?.trim();
    const sessionId = params?.sessionId?.trim();
    const deviceId = params?.deviceId?.trim();

    if (refreshToken) {
      const tokenHash = hashRefreshToken(
        refreshToken,
        this.refreshTokenHashSecret,
      );
      const refreshTokenEntity =
        await this.sessionRepository.findRefreshTokenByHash(tokenHash);
      if (
        !refreshTokenEntity ||
        !refreshTokenEntity.belongsToMember(memberId)
      ) {
        throw new UnauthorizedException('로그아웃에 실패했습니다. 다시 시도해주세요.');
      }
      await this.sessionRepository.revokeAllActiveTokensForSession({
        memberId,
        sessionId: refreshTokenEntity.sessionId,
      });
    } else if (sessionId) {
      await this.sessionRepository.revokeAllActiveTokensForSession({
        memberId,
        sessionId,
      });
    } else if (deviceId) {
      await this.sessionRepository.revokeAllActiveTokensForMemberDevice({
        memberId,
        deviceId,
      });
    } else {
      await this.sessionRepository.revokeAllActiveTokensForMember(memberId);
    }

    if (params?.clearPushTokens) {
      try {
        await this.clearPushToken.clearPushToken(memberId);
      } catch {
        throw new BadRequestException('로그아웃에 실패했습니다. 다시 시도해주세요.');
      }
    }

    return { message: '로그아웃이 완료되었습니다.' };
  }

  async changePassword(params: {
    memberId: number;
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const { memberId, currentPassword, newPassword } = params;

    const authInfo = await this.repository.findAuthByMemberId(memberId);

    if (!authInfo)
      throw new NotFoundException('이메일 정보가 존재하지 않습니다.');

    const passwordMatchResult = await bcrypt.compare(
      currentPassword,
      authInfo.password,
    );

    if (!passwordMatchResult)
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.repository.updateAuthPassword(memberId, hashedPassword);

    return { message: '비밀번호 변경이 완료되었습니다.' };
  }

  async resetPassword(params: {
    email: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const { email, newPassword } = params;

    const authInfo = await this.repository.findAuthByEmail(email);

    if (!authInfo)
      throw new NotFoundException('이메일 정보가 존재하지 않습니다.');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.repository.updateAuthPasswordByEmail(email, hashedPassword);

    return { message: '비밀번호 재설정이 완료되었습니다.' };
  }

  async remove(
    memberId: number,
    password: string,
  ): Promise<{ message: string }> {
    const authInfo = await this.repository.findAuthByMemberId(memberId);

    if (!authInfo)
      throw new BadRequestException('해당 유저가 존재하지 않습니다.');

    const passwordMatchResult = await bcrypt.compare(
      password,
      authInfo.password,
    );

    if (!passwordMatchResult)
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');

    await this.repository.deleteAuth(memberId);

    return { message: '회원 탈퇴가 완료되었습니다.' };
  }

  async externalRemove(params: {
    email: string;
    password: string;
  }): Promise<{ message: string }> {
    const { email, password } = params;

    const authInfo = await this.repository.findAuthByEmail(email);

    if (!authInfo)
      throw new BadRequestException('해당 유저가 존재하지 않습니다.');

    const passwordMatchResult = await bcrypt.compare(
      password,
      authInfo.password,
    );

    if (!passwordMatchResult)
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');

    await this.repository.deleteAuth(authInfo.memberId);

    return { message: '회원 탈퇴가 완료되었습니다.' };
  }
}
