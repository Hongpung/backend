import { Prisma } from '@prisma/client';
import type { MemberForCheckIn } from '../../../../application/ports/out/session.repository.port';

export const MEMBER_FOR_CHECK_IN_INCLUDE = {
  club: { select: { clubName: true } },
  roleAssignment: { select: { role: true } },
} satisfies Prisma.MemberInclude;

export type MemberForCheckInRow = Prisma.MemberGetPayload<{
  include: typeof MEMBER_FOR_CHECK_IN_INCLUDE;
}>;

export class SessionPrismaMapper {
  static toMemberForCheckIn(member: MemberForCheckInRow): MemberForCheckIn {
    return {
      memberId: member.memberId,
      email: member.email,
      name: member.name,
      nickname: member.nickname,
      club: member.club ? { clubName: member.club.clubName } : null,
      profileImageUrl: member.profileImageUrl,
      enrollmentNumber: member.enrollmentNumber,
      roleAssignment: member.roleAssignment.map((ra) => ({ role: ra.role })),
    };
  }
}
