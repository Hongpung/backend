import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { AdminTokenPayload } from 'src/security/domain';
import { isAdminTokenPayload } from 'src/security/domain';

export function getAdminPayload(req: { admin?: unknown }): AdminTokenPayload {
  if (!isAdminTokenPayload(req.admin)) {
    throw new UnauthorizedException('Admin authentication required');
  }
  return req.admin;
}

export function resolveAdminId(req: { admin?: unknown }): number {
  return getAdminPayload(req).adminId;
}

export function resolveAdminClubId(req: { admin?: unknown }): number | null {
  return getAdminPayload(req).clubId;
}

export function resolveAdminRole(req: { admin?: unknown }): string {
  return getAdminPayload(req).adminRole;
}

export const AdminId = createParamDecorator<undefined, number>(
  (_data, ctx: ExecutionContext) =>
    resolveAdminId(ctx.switchToHttp().getRequest()),
);

export const AdminClubId = createParamDecorator<undefined, number | null>(
  (_data, ctx: ExecutionContext) =>
    resolveAdminClubId(ctx.switchToHttp().getRequest()),
);

export const AdminRoleClaim = createParamDecorator<undefined, string>(
  (_data, ctx: ExecutionContext) =>
    resolveAdminRole(ctx.switchToHttp().getRequest()),
);
