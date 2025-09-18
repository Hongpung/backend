import type { MemberEntity } from '../../../../domain/member.entity';
import type { MemberDetailResDto } from '../../dto/response/member-detail.res.dto';
import type { MemberListItemResDto } from '../../dto/response/member-list-item.res.dto';

export class MemberResponseMapper {
  static toDetailDto(entity: MemberEntity): MemberDetailResDto {
    return {
      memberId: entity.memberId,
      name: entity.name,
      nickname: entity.nickname,
      email: entity.email,
      enrollmentNumber: entity.enrollmentNumber,
      club: entity.getClubName(),
      role: entity.getRolesAsKorean(),
      profileImageUrl: entity.profileImageUrl,
      instagramUrl: entity.instagramUrl,
      blogUrl: entity.blogUrl,
    };
  }

  static toListItemDto(entity: MemberEntity): MemberListItemResDto {
    return {
      memberId: entity.memberId,
      name: entity.name,
      nickname: entity.nickname,
      email: entity.email,
      enrollmentNumber: entity.enrollmentNumber,
      club: entity.getClubName(),
      role: entity.getRolesAsKorean(),
      profileImageUrl: entity.profileImageUrl,
      instagramUrl: entity.instagramUrl,
      blogUrl: entity.blogUrl,
    };
  }
}
