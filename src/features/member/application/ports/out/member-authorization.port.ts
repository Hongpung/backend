export const MemberAuthorizationPort = Symbol('MemberAuthorizationPort');

export interface InstrumentManagementContext {
  clubId: number;
  clubName: string;
}

export interface MemberAuthorizationPort {
  /**
   * 멤버가 악기 관리 권한이 있는지 검증.
   * - 멤버 존재 여부
   * - 역할 보유 여부 (roleAssignment.length > 0)
   * - 동아리 소속 여부 (clubId, clubName)
   *
   * @returns 권한 있으면 { clubId, clubName }, 없으면 null
   */
  getInstrumentManagementContext(
    memberId: number,
  ): Promise<InstrumentManagementContext | null>;
}
