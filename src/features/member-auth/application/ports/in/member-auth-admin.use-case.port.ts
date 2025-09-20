export const MemberAuthAdminUseCasePort = Symbol('MemberAuthAdminUseCasePort');

export interface SignupListItem {
  signupId: number;
  name: string;
  nickname: string | null;
  club: string | null;
  enrollmentNumber: string;
  email: string;
}

export interface ForceRemoveParams {
  adminId: number;
  password: string;
  targetId: number;
}

export interface MemberAuthAdminUseCasePort {
  getPendingSignupList(): Promise<SignupListItem[]>;
  getPendingSignupListByClubId(clubId: number): Promise<SignupListItem[]>;
  acceptSignUp(ids: number[]): Promise<{ message: string }>;
  rejectSignUp(ids: number[]): Promise<{ message: string }>;
  sendSignUpRequestMail(): Promise<void>;
  forceRemove(params: ForceRemoveParams): Promise<{ message: string }>;
}
