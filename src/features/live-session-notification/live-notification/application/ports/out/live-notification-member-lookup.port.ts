/** Live notification 등록에 필요한 회원 스냅샷 (member feature 도메인 비노출) */
export interface LiveNotificationMemberRegistration {
  memberId: number;
  expoToken: string | null;
}

export const LiveNotificationMemberLookupPort = Symbol(
  'LiveNotificationMemberLookupPort',
);

export interface LiveNotificationMemberLookupPort {
  loadMemberForRegistration(
    memberId: number,
  ): Promise<LiveNotificationMemberRegistration>;
}
