import type { AdminLevel } from 'src/features/admin/domain/admin.type';
import type { CreateAdminReqDto } from '../../dto/request/create-admin.req.dto';
import type { ChangeAdminReqDto } from '../../dto/request/change-admin.req.dto';

export class AdminControllerRequestMapper {
  static toAdminLevelFromCreate(dto: CreateAdminReqDto): AdminLevel {
    return dto.adminLevel;
  }

  static toAdminLevelFromChange(dto: ChangeAdminReqDto): AdminLevel {
    return dto.adminLevel;
  }
}
