/** member-auth 도메인 맥락에서 회원 대상 푸시 발송 요청 (application 모델) */
export type MemberNewDeviceLoginPushNotification = {
  memberId: number;
  deviceName?: string | null;
};
