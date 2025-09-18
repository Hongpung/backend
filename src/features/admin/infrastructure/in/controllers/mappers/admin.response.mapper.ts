import { AdminEntity } from '../../../../domain/admin.entity';
import { AdminSimpleResDto } from '../../dto/response/admin-simple.res.dto';
import { AdminListResDto } from '../../dto/response/admin-list.res.dto';
import { CreateAdminResDto } from '../../dto/response/create-admin.res.dto';
import { ChangeAdminResDto } from '../../dto/response/change-admin.res.dto';
import { DeleteAdminResDto } from '../../dto/response/delete-admin.res.dto';

/**
 * Domain Entity → Response DTO 변환 (Inbound 전용)
 */
export class AdminResponseMapper {
  static toSimpleDto(entity: AdminEntity): AdminSimpleResDto {
    return {
      memberId: entity.memberId,
      name: entity.name,
      nickname: entity.nickname,
      club: entity.club?.clubName ?? null,
      enrollmentNumber: entity.enrollmentNumber,
      adminLevel: entity.adminLevel,
    };
  }

  static toListDto(entities: AdminEntity[]): AdminListResDto {
    return {
      admins: entities.map((e) => this.toSimpleDto(e)),
    };
  }

  static toCreateDto(message: string, admin: AdminEntity): CreateAdminResDto {
    return {
      message,
      admin: this.toSimpleDto(admin),
    };
  }

  static toChangeDto(message: string, admin: AdminEntity): ChangeAdminResDto {
    return {
      message,
      admin: this.toSimpleDto(admin),
    };
  }

  static toDeleteDto(message: string, admin: AdminEntity): DeleteAdminResDto {
    return {
      message,
      admin: this.toSimpleDto(admin),
    };
  }
}
