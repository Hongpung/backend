export const AdminAuthTokenIssuerPort = Symbol('AdminAuthTokenIssuerPort');

export interface AdminAuthTokenIssuerPort {
  issueAdminToken(payload: {
    adminId: number;
    adminRole: string | null;
    clubId: number | null;
  }): Promise<string>;
}
