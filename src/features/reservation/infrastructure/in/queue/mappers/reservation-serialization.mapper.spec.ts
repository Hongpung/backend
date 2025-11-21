import { describe, expect, it } from '@jest/globals';
import { ReservationSerializationMapper } from './reservation-serialization.mapper';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import type { ReservationSerializedDto } from '../reservation-serialized.dto';

describe('ReservationSerializationMapper', () => {
  describe('toSerializable', () => {
    it('엔티티를 BullMQ 직렬화 DTO로 변환한다', () => {
      const creator = ReservationCreator.create({
        memberId: 1,
        name: '홍길동',
        nickname: null,
        email: 'a@e.com',
        enrollmentNumber: '2021',
        profileImageUrl: null,
        blogUrl: null,
        instagramUrl: null,
        clubName: '동아리',
        roles: ['MEMBER'],
      });
      const entity = ReservationEntity.create({
        reservationId: 5,
        date: AppKstDateTime.dateFormmatForDB('2026-06-01'),
        startTime: '10:00',
        endTime: '11:00',
        title: '연습',
        reservationType: 'REGULAR',
        participationAvailable: true,
        creator,
        participators: [],
        borrowInstruments: [],
      });

      const dto = ReservationSerializationMapper.toSerializable(entity);

      expect(dto.reservationId).toBe(5);
      expect(dto.date).toBe('2026-06-01');
      expect(dto.creator.memberId).toBe(1);
      expect(dto.creator.name).toBe('홍길동');
    });

    it('creator가 문자열(EXTERNAL)이면 에러', () => {
      const entity = ReservationEntity.create({
        reservationId: 6,
        date: AppKstDateTime.dateFormmatForDB('2026-06-02'),
        startTime: '09:00',
        endTime: '10:00',
        title: '외부',
        reservationType: 'EXTERNAL',
        participationAvailable: false,
        creator: '외부 단체',
        participators: [],
        borrowInstruments: [],
      });

      expect(() => ReservationSerializationMapper.toSerializable(entity)).toThrow(
        'Creator is required for ReservationEntity',
      );
    });
  });

  describe('fromSerialized', () => {
    it('직렬화 DTO에서 엔티티를 복원한다', () => {
      const data: ReservationSerializedDto = {
        reservationId: 9,
        date: '2026-06-15',
        startTime: '14:30',
        endTime: '15:30',
        title: '복원',
        reservationType: 'COMMON',
        participationAvailable: true,
        creator: {
          memberId: 1,
          name: 'a',
          nickname: null,
          email: 'a@e.com',
          enrollmentNumber: '1',
          profileImageUrl: null,
          blogUrl: null,
          instagramUrl: null,
          clubName: 'c',
          roles: ['M'],
        },
        participators: [],
        borrowInstruments: [],
      };

      const entity = ReservationSerializationMapper.fromSerialized(data);
      expect(entity.reservationId).toBe(9);
      expect(entity.title).toBe('복원');
      expect(entity.date).toEqual(AppKstDateTime.dateFormmatForDB('2026-06-15'));
      expect(entity.startTime).toBe('14:30');
      expect(entity.endTime).toBe('15:30');
      expect(entity.creator).toBeInstanceOf(ReservationCreator);
    });
  });
});
