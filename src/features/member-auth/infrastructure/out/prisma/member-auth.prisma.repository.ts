import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import {
  type IMemberAuthRepository,
  type MemberLoginInfo,
} from '../../../application/ports/out/member-auth.repository.port';
import { MemberAuthPrismaMapper } from './mappers/member-auth.prisma.mapper';

@Injectable()
export class MemberAuthPrismaRepository implements IMemberAuthRepository {
  constructor(private readonly prisma: PrismaService) {}
  async updateAuthPermission(
    memberIds: number[],
    permission: 'ACCEPTED' | 'DENIED',
  ): Promise<void> {
    await this.prisma.member.updateMany({
      where: { memberId: { in: memberIds } },
      data: { isPermmited: permission },
    });
  }

  async findAuthByEmail(email: string) {
    const member = await this.prisma.member.findUnique({
      where: { email },
      select: {
        memberId: true,
        email: true,
        password: true,
      },
    });
    return MemberAuthPrismaMapper.toDomainOrNull(member);
  }

  async findAuthByMemberId(memberId: number) {
    const member = await this.prisma.member.findUnique({
      where: { memberId },
      select: { memberId: true, email: true, password: true },
    });
    return MemberAuthPrismaMapper.toDomainOrNull(member);
  }

  async isRegisteredEmail(email: string): Promise<boolean> {
    const auth = await this.prisma.member.findUnique({
      where: { email },
      select: { memberId: true },
    });
    return !!auth;
  }

  async findClubById(clubId: number) {
    const club = await this.prisma.club.findUnique({
      where: { clubId },
      select: { clubId: true, clubName: true },
    });
    if (!club) return null;
    return {
      clubId: club.clubId,
      clubName: club.clubName,
    };
  }

  async findMemberForLogin(memberId: number): Promise<MemberLoginInfo | null> {
    const member = await this.prisma.member.findUnique({
      where: { memberId },
      select: { clubId: true, isPermmited: true },
    });
    if (!member) return null;
    return {
      clubId: member.clubId,
      canLogin: member.isPermmited === 'ACCEPTED',
    };
  }

  async signup(data: {
    email: string;
    password: string;
    name: string;
    enrollmentNumber: string;
    clubId?: number | null;
    nickname?: string | null;
  }): Promise<void> {
    await this.prisma.member.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name,
        enrollmentNumber: data.enrollmentNumber,
        clubId: data.clubId,
        nickname: data.nickname,
        isPermmited: 'PENDING',
      },
    });
  }

  async updateAuthPassword(memberId: number, password: string): Promise<void> {
    await this.prisma.member.update({
      where: { memberId },
      data: { password },
    });
  }

  async updateAuthPasswordByEmail(
    email: string,
    password: string,
  ): Promise<void> {
    await this.prisma.member.update({
      where: { email },
      data: { password },
    });
  }

  async deleteAuth(memberId: number): Promise<void> {
    await this.prisma.member.delete({
      where: { memberId },
    });
  }

  async findPendingSignupIds(): Promise<
    Array<{
      memberId: number;
      email: string;
      name: string;
      nickname: string;
      clubName: string | null;
      enrollmentNumber: string;
    }>
  > {
    const signups = await this.prisma.member.findMany({
      where: { isPermmited: 'PENDING' },
      select: {
        memberId: true,
        email: true,
        name: true,
        nickname: true,
        club: {
          select: {
            clubName: true,
          },
        },
        enrollmentNumber: true,
      },
    });
    return signups.map((signup) => ({
      memberId: signup.memberId,
      email: signup.email,
      name: signup.name,
      nickname: signup.nickname,
      clubName: signup.club?.clubName ?? null,
      enrollmentNumber: signup.enrollmentNumber,
    }));
  }

  async findPendingSignupIdsByClubId(clubId: number): Promise<
    Array<{
      memberId: number;
      email: string;
      name: string;
      nickname: string;
      clubName: string | null;
      enrollmentNumber: string;
    }>
  > {
    const signups = await this.prisma.member.findMany({
      where: { isPermmited: 'PENDING', clubId },
      select: {
        memberId: true,
        email: true,
        name: true,
        nickname: true,
        club: {
          select: {
            clubName: true,
          },
        },
        enrollmentNumber: true,
      },
    });
    return signups.map((signup) => ({
      memberId: signup.memberId,
      email: signup.email,
      name: signup.name,
      nickname: signup.nickname,
      clubName: signup.club?.clubName ?? null,
      enrollmentNumber: signup.enrollmentNumber,
    }));
  }

  async findMembersEmailName(
    memberIds: number[],
  ): Promise<Array<{ memberId: number; email: string; name: string }>> {
    const members = await this.prisma.member.findMany({
      where: { memberId: { in: memberIds } },
      select: { memberId: true, email: true, name: true },
    });
    return members;
  }
}
