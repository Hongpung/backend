import type {
  MemberTokenPayload,
  AdminTokenPayload,
  VerifiedTokenPayload,
} from './token-payload.types';

/**
 * Payload 타입 가드 - 런타임 검증 + 타입 좁힘.
 */
export function isMemberTokenPayload(
  payload: unknown,
): payload is MemberTokenPayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('email' in payload) ||
    typeof (payload as MemberTokenPayload).email !== 'string' ||
    !('memberId' in payload) ||
    !(
      typeof (payload as MemberTokenPayload).memberId === 'string' ||
      typeof (payload as MemberTokenPayload).memberId === 'number'
    )
  ) {
    return false;
  }

  if ('sid' in payload) {
    const sid = (payload as MemberTokenPayload).sid;
    if (sid === undefined || sid === null) {
      return true;
    }
    return typeof sid === 'string' && sid.trim().length > 0;
  }

  return true;
}

export function isAdminTokenPayload(
  payload: unknown,
): payload is AdminTokenPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'adminId' in payload &&
    typeof (payload as AdminTokenPayload).adminId === 'number' &&
    'adminRole' in payload &&
    typeof (payload as AdminTokenPayload).adminRole === 'string'
  );
}

export function isVerifiedTokenPayload(
  payload: unknown,
): payload is VerifiedTokenPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'verifiedEmail' in payload &&
    typeof (payload as VerifiedTokenPayload).verifiedEmail === 'string'
  );
}

/** memberId 클레임 — null/undefined 제외, 정규화 전 string | number */
export function isMemberIdClaimInput(value: unknown): value is string | number {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return false;
}

/** email 클레임 — 비어 있지 않은 문자열 */
export function isMemberEmailClaim(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** clubId 클레임 — null(미소속) 또는 정수 */
export function isMemberClubIdClaim(value: unknown): value is number | null {
  if (value === null) {
    return true;
  }
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    Number.isFinite(value)
  );
}
