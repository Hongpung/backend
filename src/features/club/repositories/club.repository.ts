import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { ClubRoleAssignmentInput } from '../models/club.commands';
import { ClubRepositoryMapper } from './mappers/club.prisma.mapper';
import { RoleEnum } from 'src/role/role.enum';
import type { Club } from '../models/club.model';
import type { IClubRepository } from './club.repository.port';

@Injectable()
export class ClubRepository implements IClubRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly clubSeclect = {
    include: {
      RoleAssignment: {
        include: {
          member: true,
        },
      },
      Instrument: true,
      members: true,
      primaryMembers: {
        include: {
          member: true,
        },
      },
    },
  };

  async findClubById(clubId: number): Promise<Club | null> {
    const club = await this.prisma.club.findUnique({
      where: { clubId },
      ...this.clubSeclect,
    });

    if (!club) return null;
    return ClubRepositoryMapper.toModel(club);
  }

  async updateClubProfileImage(
    clubId: number,
    imageUrl: string | null,
  ): Promise<void> {
    await this.prisma.club.update({
      where: { clubId },
      data: { profileImageUrl: imageUrl },
    });
  }

  async replaceClubPrimaryMembers(
    clubId: number,
    memberIds: number[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.clubPrimaryMember.deleteMany({
        where: { clubId },
      });

      if (memberIds.length === 0) {
        return;
      }

      await tx.clubPrimaryMember.createMany({
        data: memberIds.map((memberId) => ({
          clubId,
          memberId,
        })),
      });
    });
  }

  async updateClubRoles(
    clubId: number,
    roleAssignments: ClubRoleAssignmentInput[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const { role, userId } of roleAssignments) {
        const enRole = RoleEnum.KoToEn(role);

        if (userId === null) {
          await tx.roleAssignment.deleteMany({
            where: {
              clubId,
              role: enRole,
            },
          });
          continue;
        }

        if (userId === undefined) {
          continue;
        }

        await tx.roleAssignment.upsert({
          where: {
            clubId_role: {
              clubId,
              role: enRole,
            },
          },
          update: {
            memberId: userId,
          },
          create: {
            clubId,
            role: enRole,
            memberId: userId,
          },
        });
      }
    });
  }

  async findAllClubs(): Promise<Club[]> {
    const clubs = await this.prisma.club.findMany({
      ...this.clubSeclect,
    });

    return clubs.map(ClubRepositoryMapper.toModel);
  }
}
