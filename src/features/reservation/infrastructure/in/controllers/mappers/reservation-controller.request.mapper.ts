import type {
  BatchReservationInput,
  CreateReservationInput,
  ForceCreateReservationInput,
  ForceUpdateReservationInput,
  UpdateReservationInput,
} from 'src/features/reservation/application/ports/in/reservation-user-command.types';
import type { ReservationType } from 'src/features/reservation/reservation.types';
import type {
  CreateReservationDto,
  ForceCreateReservationDto,
} from '../../dto/request/create-reservation.req.dto';
import type {
  ForceUpdateReservationDto,
  UpdateReservationDto,
} from '../../dto/request/update-reservation.req.dto';
import type { BatchReservtionDTO } from '../../dto/request/batch-reservation.req.dto';

/**
 * Controller Request DTO → application 입력 모델.
 * Presentation 계층에서만 사용합니다.
 */
export class ReservationControllerRequestMapper {
  static toCreateReservationInput(
    dto: CreateReservationDto,
  ): CreateReservationInput {
    return {
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      title: dto.title,
      reservationType: dto.reservationType,
      participationAvailable: dto.participationAvailable,
      participatorIds: dto.participatorIds,
      borrowInstrumentIds: dto.borrowInstrumentIds,
    };
  }

  static toUpdateReservationInput(
    dto: UpdateReservationDto,
  ): UpdateReservationInput {
    const {
      addedParticipatorIds,
      removedParticipatorIds,
      addedBorrowInstrumentIds,
      removedBorrowInstrumentIds,
      ...rest
    } = dto;
    return {
      ...rest,
      addedParticipatorIds,
      removedParticipatorIds,
      addedBorrowInstrumentIds,
      removedBorrowInstrumentIds,
    };
  }

  static toForceCreateReservationInput(
    dto: ForceCreateReservationDto,
  ): ForceCreateReservationInput {
    return {
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      title: dto.title,
      externalCreatorName: dto.externalCreatorName,
      creatorId: dto.creatorId,
      reservationType: dto.reservationType,
      participationAvailable: dto.participationAvailable,
      participatorIds: dto.participatorIds ?? [],
      borrowInstrumentIds: dto.borrowInstrumentIds ?? [],
    };
  }

  static toForceUpdateReservationInput(
    dto: ForceUpdateReservationDto,
  ): ForceUpdateReservationInput {
    return Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    ) as ForceUpdateReservationInput;
  }

  static toBatchReservationInput(
    dto: BatchReservtionDTO<ReservationType>,
  ): BatchReservationInput<ReservationType> {
    return {
      dayTimes: dto.dayTimes,
      duration: dto.duration,
      batchReservationOption: dto.batchReservationOption,
    };
  }
}
