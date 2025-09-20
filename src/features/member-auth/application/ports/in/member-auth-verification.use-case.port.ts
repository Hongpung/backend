export const MemberAuthVerificationUseCasePort = Symbol(
  'MemberAuthVerificationUseCasePort',
);

export interface MemberAuthVerificationUseCasePort {
  sendEmailVerificationCode(email: string): Promise<void>;

  verifyEmailVerificationCode(params: {
    email: string;
    code: string;
  }): Promise<{ message: string }>;

  sendPasswordVerificationCode(email: string): Promise<void>;

  verifyPasswordVerificationCode(params: {
    email: string;
    code: string;
  }): Promise<{ message: string }>;

  issueVerificationToken(email: string): Promise<string>;
}
