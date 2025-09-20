import { toDomainOrNull } from 'src/common/persistence/prisma-mapper.util';
import { MemberRefreshTokenEntity } from '../../../../domain/member-refresh-token.entity';

export class MemberRefreshTokenPrismaMapper {
  static toDomain(data: {
    id: number;
    memberId: number;
    sessionId: string;
    deviceId: string;
    rememberMe: boolean;
    expiresAt: Date;
    revokedAt: Date | null;
  }): MemberRefreshTokenEntity {
    return new MemberRefreshTokenEntity(
      data.id,
      data.memberId,
      data.sessionId,
      data.deviceId,
      data.rememberMe,
      data.expiresAt,
      data.revokedAt,
    );
  }

  static toDomainOrNull(
    data: {
      id: number;
      memberId: number;
      sessionId: string;
      deviceId: string;
      rememberMe: boolean;
      expiresAt: Date;
      revokedAt: Date | null;
    } | null,
  ): MemberRefreshTokenEntity | null {
    return toDomainOrNull(data, MemberRefreshTokenPrismaMapper.toDomain);
  }
}
