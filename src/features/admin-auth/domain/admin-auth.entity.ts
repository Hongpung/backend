import type { AdminLevel } from 'src/features/admin/domain/admin.type';

/**
 * 관리자 인증 도메인 엔티티.
 * 로그인, 토큰 연장 시 비밀번호 검증에 사용.
 */
export class AdminAuthEntity {
  constructor(
    public readonly memberId: number,
    public readonly email: string,
    public readonly password: string,
    public readonly adminLevel: AdminLevel | null,
    public readonly clubId: number | null,
  ) {}

  isAdmin(): boolean {
    return this.adminLevel !== null;
  }

  toJwtPayload(): {
    adminId: number;
    adminRole: string | null;
    clubId: number | null;
  } {
    return {
      adminId: this.memberId,
      adminRole: this.adminLevel,
      clubId: this.clubId,
    };
  }
}
