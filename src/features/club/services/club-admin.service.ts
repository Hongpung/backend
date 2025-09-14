import {
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import {
  ClubRepositoryPort,
  type IClubRepository,
} from '../repositories/club.repository.port';
import { ClubMemberService } from './club-member.service';
import type { UpdateClubProfileCommand } from '../models/club.commands';
import type { Club, Member, ClubPrimaryMember } from '../models/club.model';

@Injectable()
export class ClubAdminService {
  constructor(
    private readonly clubMemberService: ClubMemberService,
    @Inject(ClubRepositoryPort)
    private readonly clubRepository: IClubRepository,
  ) {}

  getClubInfo(clubId: number): Promise<Club> {
    return this.clubMemberService.getClubInfo(clubId);
  }

  getClubMembers(clubId: number): Promise<Member[]> {
    return this.clubMemberService.getClubMembers(clubId);
  }

  getClubPrimaryMembers(clubId: number): Promise<ClubPrimaryMember[]> {
    return this.clubMemberService.getClubPrimaryMembers(clubId);
  }

  async getAllClubInfo(): Promise<Club[]> {
    return this.clubRepository.findAllClubs();
  }

  async updateClubPrimaryMembers(
    clubId: number,
    memberIds: number[],
  ): Promise<void> {
    const club = await this.clubRepository.findClubById(clubId);
    if (!club) {
      throw new UnauthorizedException("invalid Request: Doesn't exist club");
    }

    const normalizedMemberIds = [...new Set(memberIds)];
    if (normalizedMemberIds.length === 0) {
      throw new BadRequestException(
        '각 동아리는 최소 1명의 주요 활동 멤버를 가져야 합니다.',
      );
    }

    const clubMemberIds = new Set((club.members ?? []).map((m) => m.memberId));
    const invalidMemberIds = normalizedMemberIds.filter(
      (memberId) => !clubMemberIds.has(memberId),
    );

    if (invalidMemberIds.length > 0) {
      throw new BadRequestException(
        `해당 동아리 소속이 아닌 멤버가 포함되어 있습니다: ${invalidMemberIds.join(
          ', ',
        )}`,
      );
    }

    await this.clubRepository.replaceClubPrimaryMembers(
      clubId,
      normalizedMemberIds,
    );
  }

  async updateClubProfile(
    clubId: number,
    data: UpdateClubProfileCommand,
  ): Promise<void> {
    const club = await this.clubRepository.findClubById(clubId);
    if (!club) {
      throw new UnauthorizedException("invalid Request: Doesn't exist club");
    }

    if (data.profileImageUrl !== undefined) {
      await this.clubRepository.updateClubProfileImage(
        clubId,
        data.profileImageUrl,
      );
    }

    if (data.roleAssignments && data.roleAssignments.length > 0) {
      await this.clubRepository.updateClubRoles(clubId, data.roleAssignments);
    }
  }
}
