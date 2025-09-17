import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { type IAdminAuthRepository } from '../../../application/ports/out/admin-auth.repository.port';
import { AdminAuthPrismaMapper } from './mappers/admin-auth.prisma.mapper';

@Injectable()
export class AdminAuthPrismaRepository implements IAdminAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAuthByEmail(email: string) {
    const member = await this.prisma.member.findUnique({
      where: { email },
      select: {
        memberId: true,
        email: true,
        password: true,
        adminLevel: true,
        clubId: true,
      },
    });
    return AdminAuthPrismaMapper.toDomainOrNull(member);
  }

  async findAdminByMemberId(memberId: number) {
    const admin = await this.prisma.member.findUnique({
      where: { memberId },
      select: {
        memberId: true,
        email: true,
        password: true,
        adminLevel: true,
        clubId: true,
      },
    });
    return AdminAuthPrismaMapper.toDomainOrNull(admin);
  }

  async findAdminEmails(): Promise<Array<{ email: string }>> {
    const admins = await this.prisma.member.findMany({
      where: { adminLevel: { not: null } },
      select: { email: true },
    });
    return admins;
  }
}
