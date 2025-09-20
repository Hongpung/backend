export const VerificationTokenIssuerPort = Symbol(
  'VerificationTokenIssuerPort',
);

export interface VerificationTokenIssuerPort {
  issueVerificationToken(email: string): Promise<string>;
}
