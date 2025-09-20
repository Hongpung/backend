export const MemberAuthUseCasePort = Symbol('MemberAuthUseCasePort');

export interface MemberAuthUseCasePort {
  checkEmail(email: string): Promise<{ isRegistered: boolean }>;

  signup(params: {
    email: string;
    password: string;
    name: string;
    enrollmentNumber: string;
    clubId?: number | null;
    nickname?: string | null;
  }): Promise<{ message: string }>;

  login(params: {
    email: string;
    password: string;
    deviceId: string;
    deviceName?: string | null;
    rememberMe?: boolean;
    autoLogin?: boolean;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<{ token: string; refreshToken: string }>;

  refreshTokens(params: {
    refreshToken: string;
    deviceId: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    deviceName?: string | null;
  }): Promise<{ token: string; refreshToken: string }>;

  logout(
    memberId: unknown,
    params?: {
      refreshToken?: string;
      sessionId?: string;
      deviceId?: string;
      clearPushTokens?: boolean;
    },
  ): Promise<{ message: string }>;

  changePassword(params: {
    memberId: number;
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }>;

  resetPassword(params: {
    email: string;
    newPassword: string;
  }): Promise<{ message: string }>;

  remove(memberId: number, password: string): Promise<{ message: string }>;

  externalRemove(params: {
    email: string;
    password: string;
  }): Promise<{ message: string }>;
}
