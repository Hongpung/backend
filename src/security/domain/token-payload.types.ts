/**
 * 토큰 검증 후 payload 타입 정의.
 * Domain 계층 - 순수 타입, 외부 의존성 없음.
 */
export interface MemberTokenPayload {
  memberId: string | number | null;
  email: string;
  clubId: number | null;
  /** 로그인 세션 식별자 — 신규 액세스 토큰에만 포함될 수 있음 */
  sid?: string;
}

export interface AdminTokenPayload {
  adminId: number;
  adminRole: string;
  clubId: number | null;
}

export interface VerifiedTokenPayload {
  verifiedEmail: string;
}
