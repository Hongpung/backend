import { InstrumentEnum } from 'src/features/instrument/models/instrument-enum';
import { RoleEnum } from 'src/role/role.enum';
import type {
  Club,
  Member,
  Instrument,
  Role,
  ClubPrimaryMember,
} from '../../models/club.model';
import type {
  ClubInfoResDto,
  ClubMembersResDto,
  ClubInstrumentsResDto,
  ClubPrimaryMembersResDto,
} from '../../dto/response';
import { ClubInfoListResDto } from '../../dto/response/club-info.res.dto';

export class ClubResponseMapper {
  static toClubInfoDto(club: Club): ClubInfoResDto {
    const roleAssignment = club.roleAssignment ?? [];
    return {
      clubName: club.clubName,
      roleData: roleAssignment.map((ra: Role) => ({
        role: RoleEnum.EnToKo(ra.role),
        member: this.toMemberPlain(ra.member),
      })),
      profileImage: club.profileImageUrl ?? null,
    };
  }

  static toClubMembersDto(members: Member[]): ClubMembersResDto {
    return members.map((m) => this.toMemberPlain(m));
  }

  static toClubInstrumentsDto(
    instruments: Instrument[],
  ): ClubInstrumentsResDto {
    return instruments.map((i) => ({
      instrumentId: i.instrumentId,
      name: i.name,
      instrumentType: InstrumentEnum.EnToKo(i.instrumentType),
      imageUrl: i.imageUrl,
      borrowAvailable: i.borrowAvailable,
    }));
  }

  static toClubPrimaryMembersDto(
    primaryMembers: ClubPrimaryMember[],
  ): ClubPrimaryMembersResDto {
    return primaryMembers.map((pm) => ({
      ...this.toMemberPlain(pm.member),
      updatedAt: pm.updatedAt,
    }));
  }

  private static toMemberPlain(m: Member) {
    return {
      memberId: m.memberId,
      name: m.name,
      nickname: m.nickname,
      email: m.email,
      enrollmentNumber: m.enrollmentNumber,
      club: m.clubName,
      role: m.roleAssignment.map((r) => RoleEnum.EnToKo(r)),
      profileImageUrl: m.profileImageUrl,
      instagramUrl: m.instagramUrl,
      blogUrl: m.blogUrl,
    };
  }

  static toClubInfoListDto(clubs: Club[]): ClubInfoListResDto[] {
    return clubs.map((club) => ({
      ...this.toClubInfoDto(club),
      clubId: club.clubId,
      clubName: club.clubName,
    }));
  }
}
