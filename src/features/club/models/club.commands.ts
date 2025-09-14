import type { KoRole } from 'src/role/role.type';

export interface ClubRoleAssignmentInput {
  role: KoRole;
  userId: number | null;
}

export interface UpdateClubProfileCommand {
  profileImageUrl?: string | null;
  roleAssignments?: ClubRoleAssignmentInput[] | null;
}
