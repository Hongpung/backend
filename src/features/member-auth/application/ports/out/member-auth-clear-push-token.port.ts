export const MemberAuthClearPushTokenPort = Symbol(
  'MemberAuthClearPushTokenPort',
);

export interface IMemberAuthClearPushToken {
  clearPushToken(memberId: number): Promise<void>;
}
