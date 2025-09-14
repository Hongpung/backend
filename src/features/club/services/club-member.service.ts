import {
  Inject,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import {
  ClubRepositoryPort,
  type IClubRepository,
} from '../repositories/club.repository.port';
import type {
  Club,
  Member,
  Instrument,
  ClubPrimaryMember,
} from '../models/club.model';
import { createClubPrimaryMember } from '../models/club.model';

@Injectable()
export class ClubMemberService {
  constructor(
    @Inject(ClubRepositoryPort)
    private readonly clubRepository: IClubRepository,
  ) {}

  async getClubInfo(clubId: number): Promise<Club> {
    const club = await this.clubRepository.findClubById(clubId);
    if (!club) {
      throw new UnauthorizedException("invalid Request: Doesn't exist club");
    }
    return club;
  }

  async getClubMembers(clubId: number): Promise<Member[]> {
    const club = await this.clubRepository.findClubById(clubId);
    if (!club) {
      throw new UnauthorizedException("invalid Request: Doesn't exist club");
    }
    const members = club.members;
    if (!members) {
      throw new UnauthorizedException("invalid Request: Doesn't exist club");
    }
    return members;
  }

  async getClubPrimaryMembers(clubId: number): Promise<ClubPrimaryMember[]> {
    const club = await this.clubRepository.findClubById(clubId);
    if (club === null || club === undefined) {
      throw new UnauthorizedException("invalid Request: Doesn't exist club");
    }

    const primaryMembers = club.primaryMembers ?? [];
    if (primaryMembers.length > 0) {
      return primaryMembers;
    }

    const members = club.members ?? [];
    if (members.length === 0) {
      throw new NotFoundException(
        '동아리에 멤버가 없어 주요 활동 멤버를 지정할 수 없습니다.',
      );
    }

    return [
      createClubPrimaryMember({
        member: members[0],
        updatedAt: new Date(),
      }),
    ];
  }

  async getClubInstruments(clubId: number): Promise<Instrument[]> {
    const club = await this.clubRepository.findClubById(clubId);
    if (!club) {
      throw new UnauthorizedException("invalid Request: Doesn't exist club");
    }
    const instruments = club.instruments;
    if (!instruments) {
      throw new UnauthorizedException("invalid Request: Doesn't exist club");
    }
    return instruments;
  }
}
