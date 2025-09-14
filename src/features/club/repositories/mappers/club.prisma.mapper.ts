import type { Prisma } from '@prisma/client';
import type { EnRole } from 'src/role/role.type';
import {
  createClub,
  createMember,
  createRole,
  createInstrument,
  createClubPrimaryMember,
} from '../../models/club.model';

type ClubWithRelations = Prisma.ClubGetPayload<{
  include: {
    primaryMembers: { include: { member: true } };
    RoleAssignment: { include: { member: true } };
    Instrument: true;
    members: true;
  };
}>;

export class ClubRepositoryMapper {
  static toModel(prisma: ClubWithRelations) {
    return createClub({
      clubId: prisma.clubId,
      clubName: prisma.clubName,
      profileImageUrl: prisma.profileImageUrl,
      roleAssignment: prisma.RoleAssignment.map((ra) =>
        createRole({
          role: ra.role,
          member: createMember({
            memberId: ra.member.memberId,
            name: ra.member.name,
            nickname: ra.member.nickname,
            enrollmentNumber: ra.member.enrollmentNumber,
            email: ra.member.email,
            profileImageUrl: ra.member.profileImageUrl ?? '',
            instagramUrl: ra.member.instagramUrl ?? '',
            blogUrl: ra.member.blogUrl ?? '',
            roleAssignment: [ra.role],
            clubName: prisma.clubName,
          }),
        }),
      ),
      members: (() => {
        const memberIdToRoles = new Map<number, EnRole[]>();
        for (const ra of prisma.RoleAssignment) {
          const roles = memberIdToRoles.get(ra.memberId) ?? [];
          roles.push(ra.role);
          memberIdToRoles.set(ra.memberId, roles);
        }
        return prisma.members.map((m) =>
          createMember({
            memberId: m.memberId,
            name: m.name,
            nickname: m.nickname,
            enrollmentNumber: m.enrollmentNumber,
            email: m.email,
            clubName: prisma.clubName,
            profileImageUrl: m.profileImageUrl ?? '',
            instagramUrl: m.instagramUrl ?? '',
            blogUrl: m.blogUrl ?? '',
            roleAssignment: memberIdToRoles.get(m.memberId) ?? [],
          }),
        );
      })(),
      primaryMembers: (() => {
        const memberIdToRoles = new Map<number, EnRole[]>();
        for (const ra of prisma.RoleAssignment) {
          const roles = memberIdToRoles.get(ra.memberId) ?? [];
          roles.push(ra.role);
          memberIdToRoles.set(ra.memberId, roles);
        }

        return prisma.primaryMembers.map((pm) =>
          createClubPrimaryMember({
            member: createMember({
              memberId: pm.member.memberId,
              name: pm.member.name,
              nickname: pm.member.nickname,
              enrollmentNumber: pm.member.enrollmentNumber,
              email: pm.member.email,
              clubName: prisma.clubName,
              profileImageUrl: pm.member.profileImageUrl ?? '',
              instagramUrl: pm.member.instagramUrl ?? '',
              blogUrl: pm.member.blogUrl ?? '',
              roleAssignment: memberIdToRoles.get(pm.member.memberId) ?? [],
            }),
            updatedAt: pm.updatedAt,
          }),
        );
      })(),
      instruments: prisma.Instrument.map((i) =>
        createInstrument({
          instrumentId: i.instrumentId,
          name: i.name,
          instrumentType: i.instrumentType,
          imageUrl: i.imageUrl ?? '',
          borrowAvailable: i.borrowAvailable,
        }),
      ),
    });
  }
}
