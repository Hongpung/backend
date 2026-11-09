import type { AdminLevel } from 'src/features/admin/domain/admin.type';

export type AdminEmail = {
  email: string;
  adminLevel: AdminLevel;
  clubId: number | null;
};

export abstract class FindAdminEmailsUseCase {
  abstract findAdminEmails(): Promise<AdminEmail[]>;
}
