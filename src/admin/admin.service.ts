import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ChangeAdminDto } from './dto/change-admin.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) { }

  async getAdmins() {
    const adminList = await this.prisma.member.findMany({
      where: { adminLevel: { not: null } },
      select: {
        memberId: true,
        name: true,
        nickname: true,
        club: { select: { clubName: true } },
        enrollmentNumber: true,
        adminLevel: true,
      }
    })

    return adminList.map(admin => ({
      memberId: admin.memberId,
      name: admin.name,
      nickname: admin.nickname,
      club: admin.club?.clubName,
      enrollmentNumber: admin.enrollmentNumber,
      adminLevel: admin.adminLevel
    }))
  }

  async chageAdminLevel(requestAdminId: number, targetId: number, changeDto: ChangeAdminDto) {

    if (requestAdminId == targetId) throw new BadRequestException('본인의 권한은 수정할 수 없습니다.')

    const { adminLevel: LevelOfRequestAdmin } = await this.prisma.member.findUnique({
      where: { memberId: requestAdminId },
      select: { adminLevel: true }
    })

    if (LevelOfRequestAdmin != 'SUPER') throw new UnauthorizedException('권한이 없습니다.')

    const { adminLevel } = changeDto as { adminLevel: 'SUB' | 'SUPER' }

    try {
      // 관리자 권한 업데이트
      const updatedMember = await this.prisma.member.update({
        where: { memberId: targetId },
        data: { adminLevel },
        select: { memberId: true, adminLevel: true }, // 업데이트된 데이터 반환
      });

      return { message: 'Admin level updated successfully', member: updatedMember };
    } catch (error) {
      if (error.code === 'P2025') {
        // 업데이트할 레코드를 찾을 수 없음
        throw new NotFoundException('해당 관리자를 찾을 수 없습니다.');
      }
      // 기타 오류 처리
      throw new InternalServerErrorException('관리자 권한 업데이트에 실패했습니다.');
    }
  }

  async deleteAdminLevel(requestAdminId: number, targetId: number) {

    if (requestAdminId == targetId) throw new BadRequestException('본인의 권한은 수정할 수 없습니다.')

    const { adminLevel: LevelOfRequestAdmin } = await this.prisma.member.findUnique({
      where: { memberId: requestAdminId },
      select: { adminLevel: true }
    })

    if (LevelOfRequestAdmin != 'SUPER') throw new UnauthorizedException('권한이 없습니다.')

    try {
      // 관리자 권한 업데이트
      const deletedMember = await this.prisma.member.update({
        where: { memberId: targetId },
        data: { adminLevel: null },
        select: { memberId: true, adminLevel: true }, // 업데이트된 데이터 반환
      });

      return { message: 'Admin level updated successfully', member: deletedMember };

    } catch (error) {
      if (error.code === 'P2025') {
        // 업데이트할 레코드를 찾을 수 없음
        throw new NotFoundException('해당 관리자를 찾을 수 없습니다.');
      }
      // 기타 오류 처리
      throw new InternalServerErrorException('관리자 권한 업데이트에 실패했습니다.');
    }
  }

}
