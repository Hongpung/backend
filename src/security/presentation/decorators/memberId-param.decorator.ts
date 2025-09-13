import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { MemberTokenPayload } from 'src/security/domain';
import {
  isMemberClubIdClaim,
  isMemberEmailClaim,
  isMemberIdClaimInput,
  isMemberTokenPayload,
} from 'src/security/domain';

function getMemberPayload(req: { user?: unknown }): MemberTokenPayload {
  if (!isMemberTokenPayload(req.user)) {
    throw new UnauthorizedException('Member authentication required');
  }
  return req.user;
}

function assertClaim<T>(
  claimName: string,
  value: unknown,
  guard: (v: unknown) => v is T,
): T {
  if (value === undefined || value === null) {
    throw new UnauthorizedException(`Missing claim: ${claimName}`);
  }

  if (!guard(value)) {
    throw new BadRequestException(`Invalid claim type: ${claimName}`);
  }

  return value;
}

function toMemberIdNumber(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new UnauthorizedException('Invalid member token claim: memberId');
  }
  return n;
}

export const MemberId = createParamDecorator<
  keyof MemberTokenPayload | undefined,
  number
>((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const member = getMemberPayload(req);
  const claimName = (data ?? 'memberId') as string;
  const value = data ? member[data] : member.memberId;
  const narrowed = assertClaim(claimName, value, isMemberIdClaimInput);
  return toMemberIdNumber(narrowed);
});

export const MemberEmail = createParamDecorator<
  keyof MemberTokenPayload | undefined,
  string
>((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const member = getMemberPayload(req);
  const claimName = (data ?? 'email') as string;
  const value = data ? member[data] : member.email;
  return assertClaim(claimName, value, isMemberEmailClaim);
});

export const MemberClubId = createParamDecorator<
  keyof MemberTokenPayload | undefined,
  number | null
>((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const member = getMemberPayload(req);
  const claimName = (data ?? 'clubId') as string;
  const value = data ? member[data] : member.clubId;
  return assertClaim(claimName, value, isMemberClubIdClaim);
});
