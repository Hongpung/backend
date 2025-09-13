import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ADMIN_ROLE_KEY, type AdminRoleValue } from '../admin-role.constants';
import { AdminRoleGuard } from '../guards/admin-role.guard';

export { ADMIN_ROLE_KEY } from '../admin-role.constants';
export type { AdminRoleValue } from '../admin-role.constants';

export function AdminRole(role: AdminRoleValue | AdminRoleValue[]) {
  const roles = Array.isArray(role) ? role : [role];
  return applyDecorators(
    UseGuards(AdminRoleGuard),
    SetMetadata(ADMIN_ROLE_KEY, roles),
  );
}
