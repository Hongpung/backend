import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import type { ReservationType } from 'src/features/reservation/reservation.types';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';
import { ReservationBorrowInstrument } from 'src/features/reservation/domain/entities/reservation-borrow-instrument.entity';
import type { EnInstrumentType } from 'src/features/instrument/models/instrument.model';
import type { ReservationSerializedDto } from '../reservation-serialized.dto';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

/** ReservationEntity ↔ BullMQ job payload (inbound wire) */
export class ReservationSerializationMapper {
  static toSerializable(entity: ReservationEntity): ReservationSerializedDto {
    if (typeof entity.creator === 'string') {
      throw new Error('Creator is required for ReservationEntity');
    }
    return {
      reservationId: entity.reservationId,
      date: AppKstDateTime.kstCalendarYmdFromDbOrString(entity.date),
      startTime: entity.startTime,
      endTime: entity.endTime,
      title: entity.title,
      reservationType: entity.reservationType,
      participationAvailable: entity.participationAvailable,
      creator: {
        memberId: entity.creator.memberId,
        name: entity.creator.name,
        nickname: entity.creator.nickname,
        email: entity.creator.email,
        enrollmentNumber: entity.creator.enrollmentNumber,
        profileImageUrl: entity.creator.profileImageUrl,
        blogUrl: entity.creator.blogUrl,
        instagramUrl: entity.creator.instagramUrl,
        clubName: entity.creator.clubName,
        roles: entity.creator.roles,
      },
      participators: entity.participators.map((participator) => ({
        memberId: participator.memberId,
        name: participator.name,
        nickname: participator.nickname,
        email: participator.email,
        enrollmentNumber: participator.enrollmentNumber,
        profileImageUrl: participator.profileImageUrl,
        blogUrl: participator.blogUrl,
        instagramUrl: participator.instagramUrl,
        clubName: participator.clubName,
        roles: participator.roles,
      })),
      borrowInstruments: entity.borrowInstruments.map((instrument) => ({
        instrumentId: instrument.instrumentId,
        name: instrument.name,
        instrumentType: instrument.instrumentType,
        imageUrl: instrument.imageUrl,
        borrowAvailable: instrument.borrowAvailable,
        clubName: instrument.clubName,
      })),
    };
  }

  static fromSerialized(data: ReservationSerializedDto): ReservationEntity {
    const creator = ReservationCreator.create({
      memberId: data.creator.memberId,
      name: data.creator.name,
      nickname: data.creator.nickname,
      email: data.creator.email,
      enrollmentNumber: data.creator.enrollmentNumber,
      profileImageUrl: data.creator.profileImageUrl,
      blogUrl: data.creator.blogUrl,
      instagramUrl: data.creator.instagramUrl,
      clubName: data.creator.clubName,
      roles: data.creator.roles,
    });

    const participators = data.participators.map((participator) =>
      ReservationParticipator.create({
        memberId: participator.memberId,
        name: participator.name,
        nickname: participator.nickname,
        email: participator.email,
        enrollmentNumber: participator.enrollmentNumber,
        profileImageUrl: participator.profileImageUrl,
        blogUrl: participator.blogUrl,
        instagramUrl: participator.instagramUrl,
        clubName: participator.clubName,
        roles: participator.roles,
      }),
    );

    const borrowInstruments = data.borrowInstruments.map((instrument) =>
      ReservationBorrowInstrument.create({
        instrumentId: instrument.instrumentId,
        name: instrument.name,
        instrumentType: instrument.instrumentType as EnInstrumentType,
        imageUrl: instrument.imageUrl,
        borrowAvailable: instrument.borrowAvailable,
        clubName: instrument.clubName,
      }),
    );

    const dateStr =
      typeof data.date === 'string'
        ? data.date.length >= 10
          ? data.date.slice(0, 10)
          : data.date
        : AppKstDateTime.kstCalendarYmdFromDbOrString(data.date);

    return ReservationEntity.create({
      reservationId: data.reservationId,
      date: AppKstDateTime.dateFormmatForDB(dateStr),
      startTime: AppKstDateTime.deserializeReservationTimeToHHmm(data.startTime),
      endTime: AppKstDateTime.deserializeReservationTimeToHHmm(data.endTime),
      title: data.title,
      reservationType: data.reservationType as Exclude<
        ReservationType,
        'EXTERNAL'
      >,
      participationAvailable: data.participationAvailable,
      creator,
      participators,
      borrowInstruments,
    });
  }
}
