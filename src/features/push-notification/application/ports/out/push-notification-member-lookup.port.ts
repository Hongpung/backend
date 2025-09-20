export const PushNotificationMemberLookupPort = Symbol(
  'PushNotificationMemberLookupPort',
);

/** 푸시 토큰 등록/삭제 전 actor 존재 여부만 확인 (member 도메인 비노출) */
export interface IPushNotificationMemberLookup {
  existsMember(memberId: number): Promise<boolean>;
}
