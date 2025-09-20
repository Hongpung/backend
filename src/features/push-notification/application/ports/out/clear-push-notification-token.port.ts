/** 로그아웃 등 타 feature에서 푸시 토큰만 제거할 때 사용 (member-auth 등) */
export const ClearPushNotificationTokenPort = Symbol(
  'ClearPushNotificationTokenPort',
);

export interface IClearPushNotificationToken {
  clearPushToken(memberId: number): Promise<void>;
}
