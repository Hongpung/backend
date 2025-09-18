import { MemberEntity } from '../../../../domain/member.entity';
import type { Member, RoleAssignment, Club } from '@prisma/client';

type MemberWithRelations = Member & {
  club: Club | null;
  roleAssignment: Array<RoleAssignment>;
};

export class MemberPrismaMapper {
  static toDomain(prismaData: MemberWithRelations): MemberEntity {
    return MemberEntity.create({
      memberId: prismaData.memberId,
      name: prismaData.name,
      nickname: prismaData.nickname,
      enrollmentNumber: prismaData.enrollmentNumber,
      email: prismaData.email,
      clubId: prismaData.clubId,
      club: prismaData.club
        ? {
            clubId: prismaData.club.clubId,
            clubName: prismaData.club.clubName,
          }
        : null,
      roleAssignment: prismaData.roleAssignment.map((ra) => ({
        role: ra.role,
      })),
      isPermmited: prismaData.isPermmited as 'PENDING' | 'ACCEPTED' | 'DENIED',
      profileImageUrl: prismaData.profileImageUrl,
      instagramUrl: prismaData.instagramUrl,
      blogUrl: prismaData.blogUrl,
      pushEnable: prismaData.pushEnable,
      notificationToken: prismaData.notificationToken,
      password: prismaData.password,
    });
  }
}
