import { describe, expect, it } from '@jest/globals';
import { ClubControllerRequestMapper } from './club.request.mapper';
import type { UpdateClubProfileReqDto } from '../../dto/request/update-club-profile.req.dto';

describe('ClubControllerRequestMapper', () => {
  it('maps dto to update command', () => {
    const dto: UpdateClubProfileReqDto = {
      profileImageUrl: 'https://cdn.test/club.png',
      roleAssignments: [
        { role: '회장' as any, userId: 1 },
        { role: '총무' as any, userId: null },
      ],
    };

    const command = ClubControllerRequestMapper.toUpdateClubProfileCommand(dto);

    expect(command).toEqual({
      profileImageUrl: 'https://cdn.test/club.png',
      roleAssignments: [
        { role: '회장', userId: 1 },
        { role: '총무', userId: null },
      ],
    });
  });

  it('preserves null roleAssignments', () => {
    const dto: UpdateClubProfileReqDto = {
      roleAssignments: null,
    };

    const command = ClubControllerRequestMapper.toUpdateClubProfileCommand(dto);
    expect(command.roleAssignments).toBeNull();
  });
});
