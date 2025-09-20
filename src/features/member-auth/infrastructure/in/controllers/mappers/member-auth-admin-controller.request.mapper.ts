import type { AcceptSignupReqDto } from '../../dto/request/accept-signup.req.dto';
import type { ForceDeleteReqDto } from '../../dto/request/force-delete.req.dto';
import type { ForceRemoveParams } from '../../../../application/ports/in/member-auth-admin.use-case.port';

export class MemberAuthAdminControllerRequestMapper {
  static toAcceptedSignupIds(dto: AcceptSignupReqDto): number[] {
    return dto.acceptedSignUpIds;
  }

  static toForceRemoveParams(
    adminId: number,
    targetMemberId: number,
    dto: ForceDeleteReqDto,
  ): ForceRemoveParams {
    return {
      adminId,
      password: dto.password,
      targetId: targetMemberId,
    };
  }
}
