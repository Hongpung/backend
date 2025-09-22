import { RoleEnum } from 'src/role/role.enum';
import type { MemberForCheckInWithClubAndRoles } from '../../../application/ports/out/session.repository.port';
import type { SessionUser } from '../../../domain/value-objects/session-user.vo';

export class MemberForCheckInToSessionUserMapper {
  static toSessionUser(member: MemberForCheckInWithClubAndRoles): SessionUser {
    return {
      memberId: member.memberId,
      email: member.email,
      name: member.name,
      nickname: member.nickname,
      club: member.club.clubName,
      enrollmentNumber: member.enrollmentNumber,
      role: member.roleAssignment.map((roleAssignment) =>
        RoleEnum.EnToKo(roleAssignment.role),
      ),
      profileImageUrl: member.profileImageUrl,
    };
  }
}
