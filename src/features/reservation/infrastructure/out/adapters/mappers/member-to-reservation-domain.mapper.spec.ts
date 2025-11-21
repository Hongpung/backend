import { describe, expect, it } from '@jest/globals';
import type { MemberLookupReadModel } from 'src/features/member/application/ports/in/member-lookup.read-model';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';
import {
  toCreator,
  toParticipator,
} from './member-to-reservation-domain.mapper';

function createReadModel(memberId: number): MemberLookupReadModel {
  return {
    memberId,
    name: `회원${memberId}`,
    nickname: '별명',
    enrollmentNumber: '2021000001',
    email: `m${memberId}@test.com`,
    clubName: '동아리A',
    roles: ['LEADER'],
    profileImageUrl: null,
    instagramUrl: null,
    blogUrl: null,
    notificationToken: null,
  };
}

describe('member-to-reservation-domain.mapper', () => {
  describe('toCreator', () => {
    it('memberId, name, clubName, roles를 ReservationCreator에 매핑한다', () => {
      const member = createReadModel(42);

      const creator = toCreator(member);

      expect(creator).toBeInstanceOf(ReservationCreator);
      expect(creator.memberId).toBe(42);
      expect(creator.name).toBe('회원42');
      expect(creator.clubName).toBe('동아리A');
      expect(creator.roles).toEqual(['LEADER']);
    });
  });

  describe('toParticipator', () => {
    it('memberId, name, clubName, roles를 ReservationParticipator에 매핑한다', () => {
      const member = createReadModel(7);

      const participator = toParticipator(member);

      expect(participator).toBeInstanceOf(ReservationParticipator);
      expect(participator.memberId).toBe(7);
      expect(participator.name).toBe('회원7');
      expect(participator.clubName).toBe('동아리A');
      expect(participator.roles).toEqual(['LEADER']);
    });
  });
});
