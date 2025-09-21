import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { RoleEnum } from 'src/role/role.enum';
import { InstrumentEnum } from 'src/features/instrument/models/instrument-enum';
import { OccupiedTimeReadModel } from 'src/features/reservation/application/ports/out/reservation.repository.port';
import {
  OccupiedTimeSlotResponseReadModel,
  ReservationDetailResponseReadModel,
  ReservationParticipatorReadModel,
  ReservationBorrowInstrumentReadModel,
  ReservationResponseReadModel,
} from 'src/features/reservation/domain/read-models/reservation-response.read-model';

/**
 * 도메인 엔티티 → Controller 응답 스키마(검증용 DTO와 동일한 형태).
 * Presentation 계층에서만 사용합니다.
 */
export class ReservationControllerResponseMapper {
  static toOccupiedSlot(
    raw: OccupiedTimeReadModel,
  ): OccupiedTimeSlotResponseReadModel {
    return {
      reservationId: raw.reservationId,
      title: raw.title,
      reservationType: raw.reservationType,
      startTime: AppKstDateTime.timeFormmatForClient(raw.startTime),
      endTime: AppKstDateTime.timeFormmatForClient(raw.endTime),
      creator: raw.creator ? { name: raw.creator.name } : null,
      externalCreatorName: raw.externalCreatorName ?? null,
    };
  }

  static toOccupiedList(
    rows: OccupiedTimeReadModel[],
  ): OccupiedTimeSlotResponseReadModel[] {
    return rows.map((row) => this.toOccupiedSlot(row));
  }

  static toListItem(entity: ReservationEntity): ReservationResponseReadModel {
    if (typeof entity.creator === 'string') {
      return {
        reservationId: entity.reservationId!,
        date: AppKstDateTime.kstCalendarYmdFromDbOrString(entity.date),
        startTime: entity.startTime,
        endTime: entity.endTime,
        title: entity.title,
        reservationType: entity.reservationType,
        participationAvailable: entity.participationAvailable,
        creatorName: entity.creator,
        amountOfParticipators: entity.participators.length,
      };
    }
    return {
      reservationId: entity.reservationId!,
      date: AppKstDateTime.kstCalendarYmdFromDbOrString(entity.date),
      startTime: entity.startTime,
      endTime: entity.endTime,
      title: entity.title,
      reservationType: entity.reservationType,
      participationAvailable: entity.participationAvailable,
      creatorId: entity.creator.memberId,
      creatorName: entity.creator.name,
      creatorNickname: entity.creator.nickname ?? undefined,
      amountOfParticipators: entity.participators.length,
    };
  }

  static toList(entities: ReservationEntity[]): ReservationResponseReadModel[] {
    return entities.map((e) => this.toListItem(e));
  }

  static toDetail(
    entity: ReservationEntity,
  ): ReservationDetailResponseReadModel {
    if (typeof entity.creator === 'string') {
      return {
        reservationId: entity.reservationId!,
        title: entity.title,
        reservationType: entity.reservationType,
        participationAvailable: entity.participationAvailable,
        creatorName: entity.creator as string,
        date: AppKstDateTime.kstCalendarYmdFromDbOrString(entity.date),
        startTime: entity.startTime,
        endTime: entity.endTime,
        participators: entity.participators.map(
          (participator): ReservationParticipatorReadModel => ({
            memberId: participator.memberId,
            profileImageUrl: participator.profileImageUrl,
            name: participator.name,
            nickname: participator.nickname,
            club: participator.clubName,
            blogUrl: participator.blogUrl,
            instagramUrl: participator.instagramUrl,
            enrollmentNumber: participator.enrollmentNumber,
            role: participator.roles.map((role) =>
              RoleEnum.EnToKo(role as any),
            ),
          }),
        ),
        borrowInstruments: entity.borrowInstruments.map(
          (instrument): ReservationBorrowInstrumentReadModel => ({
            instrumentId: instrument.instrumentId,
            name: instrument.name,
            instrumentType: InstrumentEnum.EnToKo(instrument.instrumentType),
            imageUrl: instrument.imageUrl,
            club: instrument.getClubName(),
          }),
        ),
      };
    }

    return {
      reservationId: entity.reservationId!,
      title: entity.title,
      reservationType: entity.reservationType,
      participationAvailable: entity.participationAvailable,
      creatorId: entity.creator.memberId,
      creatorName: entity.creator.name,
      creatorNickname: entity.creator.nickname,
      date: AppKstDateTime.kstCalendarYmdFromDbOrString(entity.date),
      startTime: entity.startTime,
      endTime: entity.endTime,
      participators: entity.participators.map(
        (participator): ReservationParticipatorReadModel => ({
          memberId: participator.memberId,
          profileImageUrl: participator.profileImageUrl,
          name: participator.name,
          nickname: participator.nickname,
          club: participator.clubName,
          blogUrl: participator.blogUrl,
          instagramUrl: participator.instagramUrl,
          enrollmentNumber: participator.enrollmentNumber,
          role: participator.roles.map((role) => RoleEnum.EnToKo(role as any)),
        }),
      ),
      borrowInstruments: entity.borrowInstruments.map(
        (instrument): ReservationBorrowInstrumentReadModel => ({
          instrumentId: instrument.instrumentId,
          name: instrument.name,
          instrumentType: InstrumentEnum.EnToKo(instrument.instrumentType),
          imageUrl: instrument.imageUrl,
          club: instrument.getClubName(),
        }),
      ),
    };
  }
}
