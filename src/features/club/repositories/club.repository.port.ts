import type { ClubRoleAssignmentInput } from '../models/club.commands';
import type { Club } from '../models/club.model';

export const ClubRepositoryPort = Symbol('ClubRepositoryPort');

export interface IClubRepository {
  findClubById(clubId: number): Promise<Club | null>;
  updateClubProfileImage(
    clubId: number,
    imageUrl: string | null,
  ): Promise<void>;
  replaceClubPrimaryMembers(clubId: number, memberIds: number[]): Promise<void>;
  updateClubRoles(
    clubId: number,
    roleAssignments: ClubRoleAssignmentInput[],
  ): Promise<void>;
  findAllClubs(): Promise<Club[]>;
}
