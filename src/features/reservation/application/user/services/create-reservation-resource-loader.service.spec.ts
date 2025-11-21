import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { CreateReservationResourceLoaderService } from './create-reservation-resource-loader.service';
import type { ReservationMemberLookupPort } from 'src/features/reservation/application/ports/out/reservation-member-lookup.port';
import type { ReservationInstrumentLookupPort } from 'src/features/reservation/application/ports/out/reservation-instrument-lookup.port';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';

describe('CreateReservationResourceLoaderService', () => {
  let service: CreateReservationResourceLoaderService;
  let memberLookup: jest.Mocked<
    Pick<
      ReservationMemberLookupPort,
      'loadCreator' | 'loadCreatorAndParticipators' | 'loadParticipatorsById'
    >
  >;
  let instrumentLookup: jest.Mocked<
    Pick<ReservationInstrumentLookupPort, 'loadBorrowInstruments'>
  >;

  beforeEach(() => {
    memberLookup = {
      loadCreator: jest.fn(),
      loadCreatorAndParticipators: jest.fn(),
      loadParticipatorsById: jest.fn(),
    };
    instrumentLookup = {
      loadBorrowInstruments: jest.fn(),
    };
    service = new CreateReservationResourceLoaderService(
      memberLookup as unknown as ReservationMemberLookupPort,
      instrumentLookup as unknown as ReservationInstrumentLookupPort,
    );
  });

  describe('loadCreator', () => {
    it('포트 loadCreator 결과를 그대로 반환한다', async () => {
      const creator = ReservationCreator.create({
        memberId: 42,
        name: '회원42',
        nickname: '별명',
        enrollmentNumber: '2021000001',
        email: 'm42@test.com',
        clubName: '동아리A',
        roles: ['LEADER'],
        profileImageUrl: null,
        instagramUrl: null,
        blogUrl: null,
      });
      memberLookup.loadCreator.mockResolvedValue(creator);

      const result = await service.loadCreator(42);

      expect(memberLookup.loadCreator).toHaveBeenCalledWith(42);
      expect(result).toBe(creator);
      expect(result.memberId).toBe(42);
      expect(result.name).toBe('회원42');
      expect(result.clubName).toBe('동아리A');
    });

    it('포트가 ForbiddenException이면 그대로 전파한다', async () => {
      memberLookup.loadCreator.mockRejectedValue(
        new ForbiddenException('생성자 정보를 찾을 수 없습니다.'),
      );

      await expect(service.loadCreator(99)).rejects.toThrow(ForbiddenException);
      await expect(service.loadCreator(99)).rejects.toThrow(
        '생성자 정보를 찾을 수 없습니다.',
      );
    });
  });
});
