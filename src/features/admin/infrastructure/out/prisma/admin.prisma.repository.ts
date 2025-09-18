import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { AdminEntity } from '../../../domain/admin.entity';
import { IAdminRepository } from '../../../application/ports/out/admin.repository.port';
import { AdminPrismaMapper } from './mappers/admin.prisma.mapper';

@Injectable()
export class PrismaAdminRepository implements IAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllAdmins(): Promise<AdminEntity[]> {
    const adminList = await this.prisma.member.findMany({
      where: { adminLevel: { not: null } },
      include: { club: true },
    });
    return adminList.map((row) => AdminPrismaMapper.toDomain(row));
  }

  async findAdminLevel(memberId: number): Promise<AdminEntity | null> {
    const admin = await this.prisma.member.findUnique({
      where: { memberId },
      include: { club: true },
    });
    return admin ? AdminPrismaMapper.toDomain(admin) : null;
  }

  async findAdminByMemberId(memberId: number): Promise<AdminEntity | null> {
    const member = await this.prisma.member.findUnique({
      where: { memberId },
      include: { club: true },
    });
    if (!member) return null;
    return AdminPrismaMapper.toDomain(member);
  }

  async createAdminLevel(
    memberId: number,
    adminLevel: 'SUB' | 'SUPER',
  ): Promise<void> {
    try {
      await this.prisma.member.update({
        where: { memberId },
        data: { adminLevel },
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'P2025') {
        throw new NotFoundException('해당 유저를 찾을 수 없습니다.');
      }
      throw new InternalServerErrorException(
        '관리자 권한 부여에 실패했습니다.',
      );
    }
  }

  async updateAdminLevel(
    memberId: number,
    adminLevel: 'SUB' | 'SUPER',
  ): Promise<void> {
    try {
      await this.prisma.member.update({
        where: { memberId },
        data: { adminLevel },
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'P2025') {
        throw new NotFoundException('해당 관리자를 찾을 수 없습니다.');
      }
      throw new InternalServerErrorException(
        '관리자 권한 업데이트에 실패했습니다.',
      );
    }
  }

  async deleteAdminLevel(memberId: number): Promise<void> {
    try {
      await this.prisma.member.update({
        where: { memberId },
        data: { adminLevel: null },
      });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'P2025') {
        throw new NotFoundException('해당 관리자를 찾을 수 없습니다.');
      }
      throw new InternalServerErrorException(
        '관리자 권한 업데이트에 실패했습니다.',
      );
    }
  }
}
