import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import {
  ISessionRepository,
  MemberForCheckIn,
  type MemberForCheckInWithClubAndRoles,
} from '../../../application/ports/out/session.repository.port';
import { MemberForCheckInToSessionUserMapper } from '../mappers/member-for-check-in-to-session-user.mapper';
import {
  MEMBER_FOR_CHECK_IN_INCLUDE,
  SessionPrismaMapper,
} from '../prisma/mappers/session.prisma.mapper';
import type { SessionUser } from '../../../domain/value-objects/session-user.vo';

@Injectable()
export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMemberForCheckIn(
    memberId: number,
  ): Promise<MemberForCheckIn | null> {
    const member = await this.prisma.member.findUnique({
      where: { memberId },
      include: MEMBER_FOR_CHECK_IN_INCLUDE,
    });

    if (!member) return null;

    return SessionPrismaMapper.toMemberForCheckIn(member);
  }

  toSessionUserFromCheckInMember(
    member: MemberForCheckInWithClubAndRoles,
  ): SessionUser {
    return MemberForCheckInToSessionUserMapper.toSessionUser(member);
  }
}
