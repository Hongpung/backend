export const MemberAuthMailSenderPort = Symbol('MemberAuthMailSenderPort');

export interface MemberAuthMailSenderPort {
  sendSignUpAcceptedMail(email: string, name: string): Promise<void>;
  sendSignUpRequestedMail(email: string, pendingCount: number): Promise<void>;
  sendEmailConfirmMail(email: string, verificationCode: number): Promise<void>;
  sendPasswordModifyMail(
    email: string,
    verificationCode: number,
  ): Promise<void>;
}
