import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type {
  IMemberRepository,
  TransactionContext,
} from '../../../application/ports/out/member.repository.port';
import type { MemberSearchParams } from '../../../domain/member-search.params';
import type { MemberSortOption } from '../../../domain/member-sort.option';
import { MemberPrismaMapper } from './mappers/member.prisma.mapper';
import { RoleEnum } from 'src/role/role.enum';
import { Prisma } from '@prisma/client';

@Injectable()
export class MemberPrismaRepository implements IMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toPrismaWhere(params: MemberSearchParams): Prisma.MemberWhereInput {
    const andConditions: Prisma.MemberWhereInput[] = [];

    if (params.username?.trim()) {
      andConditions.push({
        OR: [
          { name: { contains: params.username } },
          { nickname: { contains: params.username } },
        ],
      });
    }
    if (params.clubId !== undefined) {
      andConditions.push({ clubId: params.clubId });
    }
    if (params.clubIds?.length) {
      andConditions.push({ clubId: { in: params.clubIds } });
    }
    if (params.role) {
      andConditions.push({
        roleAssignment: {
          some: { role: RoleEnum.KoToEn(params.role) },
        },
      });
    }
    if (params.isPermitted) {
      andConditions.push({ isPermmited: params.isPermitted });
    }
    if (params.minEnrollmentNumber || params.maxEnrollmentNumber) {
      const enrollment: Prisma.StringFilter = {};
      if (params.minEnrollmentNumber)
        enrollment.gte = params.minEnrollmentNumber;
      if (params.maxEnrollmentNumber)
        enrollment.lte = params.maxEnrollmentNumber;
      andConditions.push({ enrollmentNumber: enrollment });
    }

    return andConditions.length > 0 ? { AND: andConditions } : {};
  }

  async findMemberByMemberId(memberId: number) {
    const member = await this.prisma.member.findUnique({
      where: { memberId },
      include: { club: true, roleAssignment: true },
    });
    return member ? MemberPrismaMapper.toDomain(member) : null;
  }

  async findMembersByIds(memberIds: number[]) {
    if (memberIds.length === 0) return [];
    const members = await this.prisma.member.findMany({
      where: { memberId: { in: memberIds } },
      include: { club: true, roleAssignment: true },
    });
    return members.map((m) => MemberPrismaMapper.toDomain(m));
  }

  async findMembersByCondition(params: MemberSearchParams) {
    const where = this.toPrismaWhere(params);
    const members = await this.prisma.member.findMany({
      where,
      include: { club: true, roleAssignment: true },
    });
    return members.map((m) => MemberPrismaMapper.toDomain(m));
  }

  async countMembersByCondition(params: MemberSearchParams) {
    const where = this.toPrismaWhere(params);
    return this.prisma.member.count({ where });
  }

  async findMembersByConditionPaginated(
    params: MemberSearchParams,
    skip: number,
    take: number,
    orderBy?: MemberSortOption,
  ) {
    const where = this.toPrismaWhere(params);
    const members = await this.prisma.member.findMany({
      where,
      include: { club: true, roleAssignment: true },
      orderBy: (orderBy || {
        enrollmentNumber: 'asc',
      }) as Prisma.MemberOrderByWithRelationInput,
      skip,
      take,
    });
    return members.map((m) => MemberPrismaMapper.toDomain(m));
  }

  async updateMemberProfile(
    memberId: number,
    data: {
      profileImageUrl?: string | null;
      nickname?: string | null;
      instagramUrl?: string | null;
      blogUrl?: string | null;
      name?: string;
      clubId?: number | null;
      email?: string;
    },
  ) {
    const existing = await this.prisma.member.findUnique({
      where: { memberId },
      select: { clubId: true },
    });
    if (!existing) {
      throw new NotFoundException(`MemberId: '${memberId}' is not exist`);
    }

    const clubIdChanging =
      data.clubId !== undefined && data.clubId !== existing.clubId;

    if (data.clubId !== undefined && data.clubId !== null) {
      const clubExists = await this.prisma.club.count({
        where: { clubId: data.clubId },
      });
      if (!clubExists) {
        throw new NotFoundException(`ClubId: '${data.clubId}' is not exist`);
      }
    }

    const updateData: Prisma.MemberUpdateInput = {};
    if (data.profileImageUrl !== undefined)
      updateData.profileImageUrl = data.profileImageUrl;
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.instagramUrl !== undefined)
      updateData.instagramUrl = data.instagramUrl;
    if (data.blogUrl !== undefined) updateData.blogUrl = data.blogUrl;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.clubId !== undefined) {
      if (data.clubId === null) {
        updateData.club = { disconnect: true };
      } else {
        updateData.club = { connect: { clubId: data.clubId } };
      }
    }
    if (data.email !== undefined) updateData.email = data.email;

    if (Object.keys(updateData).length === 0) {
      const member = await this.prisma.member.findUnique({
        where: { memberId },
        include: { club: true, roleAssignment: true },
      });
      if (!member) {
        throw new NotFoundException(`MemberId: '${memberId}' is not exist`);
      }
      return MemberPrismaMapper.toDomain(member);
    }

    try {
      const member = await this.prisma.$transaction(async (tx) => {
        if (clubIdChanging) {
          await tx.clubPrimaryMember.deleteMany({ where: { memberId } });
          await tx.roleAssignment.deleteMany({ where: { memberId } });
        }
        return tx.member.update({
          where: { memberId },
          data: updateData,
          include: { club: true, roleAssignment: true },
        });
      });
      return MemberPrismaMapper.toDomain(member);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('이미 사용 중인 이메일입니다.');
      }
      throw e;
    }
  }

  async findRoleAssignmentIdByRoleAndClub(role: string, clubId: number) {
    const ra = await this.prisma.roleAssignment.findFirst({
      where: { role: role as any, clubId },
      select: { roleAssignmentId: true },
    });
    return ra?.roleAssignmentId ?? null;
  }

  async deleteRoleAssignments(
    memberId: number,
    clubId: number,
    tx?: TransactionContext,
  ) {
    const client = (tx as any) || this.prisma;
    await client.roleAssignment.deleteMany({
      where: { memberId, clubId },
    });
  }

  async createRoleAssignment(
    data: { clubId: number; memberId: number; role: string },
    tx?: TransactionContext,
  ) {
    const client = (tx as any) || this.prisma;
    await client.roleAssignment.create({
      data: {
        clubId: data.clubId,
        memberId: data.memberId,
        role: data.role as any,
      },
    });
  }

  async updateRoleAssignment(
    roleAssignmentId: number,
    memberId: number,
    tx?: TransactionContext,
  ) {
    const client = (tx as any) || this.prisma;
    await client.roleAssignment.update({
      where: { roleAssignmentId },
      data: { memberId },
    });
  }

  async transaction<T>(
    callback: (tx: TransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(callback) as Promise<T>;
  }

  async updateMembersPermission(
    memberIds: number[],
    status: 'ACCEPTED' | 'DENIED',
  ) {
    await this.prisma.member.updateMany({
      where: { memberId: { in: memberIds } },
      data: { isPermmited: status },
    });
  }

  async deleteMember(memberId: number) {
    await this.prisma.member.delete({ where: { memberId } });
  }

  async existsMember(memberId: number) {
    const count = await this.prisma.member.count({
      where: { memberId },
    });
    return count > 0;
  }

  async findMembersEmailName(memberIds: number[]) {
    const members = await this.prisma.member.findMany({
      where: { memberId: { in: memberIds } },
      select: { memberId: true, email: true, name: true },
    });
    return members.map((m) => ({
      memberId: m.memberId,
      email: m.email,
      name: m.name,
    }));
  }
}
