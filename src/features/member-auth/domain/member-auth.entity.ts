/**
 * 일반 사용자 비밀번호 검증용 Auth Entity
 *
 * 일반 사용자 로그인 시 비밀번호 검증에 사용됩니다.
 * memberId, email, password만 포함하는 최소한의 정보로 구성됩니다.
 */
export class MemberAuthEntity {
  constructor(
    public readonly memberId: number,
    public readonly email: string,
    public readonly password: string,
  ) {}

  toJwtPayload({
    clubId,
    sid,
  }: {
    clubId: number | null;
    sid?: string;
  }): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      memberId: this.memberId,
      email: this.email,
      clubId: clubId ?? 0,
    };
    if (sid !== undefined && sid.length > 0) {
      payload.sid = sid;
    }
    return payload;
  }
}
