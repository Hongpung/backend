import type { UpdateClubProfileCommand } from '../../models/club.commands';
import type { UpdateClubProfileReqDto } from '../../dto/request/update-club-profile.req.dto';

export class ClubControllerRequestMapper {
  static toUpdateClubProfileCommand(
    dto: UpdateClubProfileReqDto,
  ): UpdateClubProfileCommand {
    return {
      profileImageUrl: dto.profileImageUrl,
      roleAssignments: dto.roleAssignments
        ? dto.roleAssignments.map((assignment) => ({
            role: assignment.role,
            userId: assignment.userId,
          }))
        : (dto.roleAssignments ?? null),
    };
  }
}
