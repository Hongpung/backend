export type AdminEmail = { email: string };

export abstract class FindAdminEmailsUseCase {
  abstract findAdminEmails(): Promise<AdminEmail[]>;
}
