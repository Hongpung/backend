export class MemberRefreshTokenEntity {
  constructor(
    public readonly id: number,
    public readonly memberId: number,
    public readonly sessionId: string,
    public readonly deviceId: string,
    public readonly rememberMe: boolean,
    public readonly expiresAt: Date,
    public readonly revokedAt: Date | null,
  ) {}

  matchesDevice(deviceId: string): boolean {
    return this.deviceId === deviceId;
  }

  isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  belongsToMember(memberId: number): boolean {
    return this.memberId === memberId;
  }
}
