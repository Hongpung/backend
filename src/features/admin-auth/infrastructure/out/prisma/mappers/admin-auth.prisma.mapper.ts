import { toDomainOrNull } from 'src/common/persistence/prisma-mapper.util';
import { AdminAuthEntity } from '../../../../domain/admin-auth.entity';
import type { AdminLevel } from 'src/features/admin/domain/admin.type';
import type { AdminLevel as PrismaAdminLevel } from '@prisma/client';

export class AdminAuthPrismaMapper {
  static toDomain(data: {
    memberId: number;
    email: string;
    password: string;
    adminLevel: PrismaAdminLevel | null;
    clubId: number | null;
  }): AdminAuthEntity {
    return new AdminAuthEntity(
      data.memberId,
      data.email,
      data.password,
      data.adminLevel as AdminLevel | null,
      data.clubId,
    );
  }

  static toDomainOrNull(
    data: {
      memberId: number;
      email: string;
      password: string;
      adminLevel: PrismaAdminLevel | null;
      clubId: number | null;
    } | null,
  ): AdminAuthEntity | null {
    return toDomainOrNull(data, AdminAuthPrismaMapper.toDomain);
  }
}
