import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
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

    return club.primaryMembers ?? [];
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
