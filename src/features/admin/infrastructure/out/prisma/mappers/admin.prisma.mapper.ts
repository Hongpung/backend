import { Club as PrismaClub } from '@prisma/client';
import { AdminEntity } from '../../../../domain/admin.entity';
import { ClubVO } from '../../../../domain/club.vo';

type PrismaMemberWithClub = {
  memberId: number;
  email: string;
  name: string;
  nickname: string | null;
  enrollmentNumber: string;
  clubId: number | null;
  adminLevel: 'SUPER' | 'SUB' | null;
  club?: PrismaClub | null;
};

/**
 * Prisma Model → Domain Entity 변환 (Outbound 전용)
 */
export class AdminPrismaMapper {
  static toDomain(data: PrismaMemberWithClub): AdminEntity {
    return AdminEntity.create({
      memberId: data.memberId,
      email: data.email,
      name: data.name,
      nickname: data.nickname,
      enrollmentNumber: data.enrollmentNumber,
      clubId: data.clubId,
      club: data.club ? ClubVO.create(data.club) : null,
      adminLevel: data.adminLevel,
    });
  }
}
