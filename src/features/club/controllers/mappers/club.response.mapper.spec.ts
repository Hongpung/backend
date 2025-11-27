import { describe, expect, it } from '@jest/globals';
import { ClubResponseMapper } from './club.response.mapper';
import {
  createMember,
  createClub,
  createRole,
  createInstrument,
  createClubPrimaryMember,
} from '../../models/club.model';

describe('ClubResponseMapper', () => {
  const makeMember = (
    overrides?: Partial<Parameters<typeof createMember>[0]>,
  ) =>
    createMember({
      memberId: 1,
      name: '홍길동',
      nickname: '길동',
      email: 'h@test.com',
      clubName: '풍물패',
      enrollmentNumber: '20240001',
      profileImageUrl: 'https://cdn/u.png',
      instagramUrl: 'https://ig.example/u',
      blogUrl: 'https://blog.example',
      roleAssignment: ['LEADER', 'SANGSOE'],
      ...overrides,
    });

  describe('toClubInfoDto', () => {
    it('역할 배정을 한글 역할명과 멤버 플레인 객체로 매핑한다', () => {
      const member = makeMember({ roleAssignment: ['LEADER'] });
      const club = createClub({
        clubId: 10,
        clubName: '풍물패',
        profileImageUrl: null,
        roleAssignment: [createRole({ role: 'LEADER', member })],
      });

      const dto = ClubResponseMapper.toClubInfoDto(club);

      expect(dto.clubName).toBe('풍물패');
      expect(dto.profileImage).toBeNull();
      expect(dto.roleData).toEqual([
        {
          role: '패짱',
          member: {
            memberId: 1,
            name: '홍길동',
            nickname: '길동',
            email: 'h@test.com',
            enrollmentNumber: '20240001',
            club: '풍물패',
            role: ['패짱'],
            profileImageUrl: 'https://cdn/u.png',
            instagramUrl: 'https://ig.example/u',
            blogUrl: 'https://blog.example',
          },
        },
      ]);
    });
  });

  describe('toClubMembersDto', () => {
    it('멤버 배열을 플레인 객체 배열로 변환하고 역할은 한글로 바꾼다', () => {
      const members = [
        makeMember({
          memberId: 2,
          roleAssignment: ['SUBUK', 'LEADER'],
        }),
      ];

      const dto = ClubResponseMapper.toClubMembersDto(members);

      expect(dto).toEqual([
        {
          memberId: 2,
          name: '홍길동',
          nickname: '길동',
          email: 'h@test.com',
          enrollmentNumber: '20240001',
          club: '풍물패',
          role: ['수북', '패짱'],
          profileImageUrl: 'https://cdn/u.png',
          instagramUrl: 'https://ig.example/u',
          blogUrl: 'https://blog.example',
        },
      ]);
    });
  });

  describe('toClubInstrumentsDto', () => {
    it('악기 타입을 한글로 변환한다', () => {
      const instruments = [
        createInstrument({
          instrumentId: 5,
          name: '꽹1',
          instrumentType: 'KWANGGWARI',
          imageUrl: 'https://cdn/i.png',
          borrowAvailable: true,
        }),
      ];

      const dto = ClubResponseMapper.toClubInstrumentsDto(instruments);

      expect(dto).toEqual([
        {
          instrumentId: 5,
          name: '꽹1',
          instrumentType: '꽹과리',
          imageUrl: 'https://cdn/i.png',
          borrowAvailable: true,
        },
      ]);
    });
  });

  describe('toClubPrimaryMembersDto', () => {
    it('멤버 필드와 updatedAt을 함께 반환한다', () => {
      const updatedAt = new Date('2024-01-02T03:04:05.000Z');
      const primaryMembers = [
        createClubPrimaryMember({
          member: makeMember({ roleAssignment: ['LEADER'] }),
          updatedAt,
        }),
      ];

      const dto = ClubResponseMapper.toClubPrimaryMembersDto(primaryMembers);

      expect(dto[0].updatedAt).toEqual(updatedAt);
      expect(dto[0].memberId).toBe(1);
      expect(dto[0].role).toEqual(['패짱']);
    });
  });

  describe('toClubInfoListDto', () => {
    it('각 동아리에 clubId를 붙여 목록으로 변환한다', () => {
      const m = makeMember({ roleAssignment: ['LEADER'] });
      const clubs = [
        createClub({
          clubId: 1,
          clubName: 'A패',
          roleAssignment: [createRole({ role: 'LEADER', member: m })],
          profileImageUrl: undefined,
        }),
        createClub({
          clubId: 2,
          clubName: 'B패',
          roleAssignment: [],
          profileImageUrl: null,
        }),
      ];

      const list = ClubResponseMapper.toClubInfoListDto(clubs);

      expect(list).toHaveLength(2);
      expect(list[0]).toMatchObject({
        clubId: 1,
        clubName: 'A패',
      });
      expect(list[1]).toMatchObject({
        clubId: 2,
        clubName: 'B패',
        profileImage: null,
      });
    });
  });
});
