import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  Inject,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UpdateReservationCommand } from '../update-reservation.command';
import {
  ReservationRepositoryPort,
  IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationTimeUtil } from 'src/features/reservation/reservation.utils';
import { CreateReservationResourceLoaderService } from '../../services/create-reservation-resource-loader.service';
import { ReservationEventPublisherPort } from 'src/features/reservation/application/ports/out/reservation-event-publisher.port';
import type { ReservationCommandMessageResult } from 'src/features/reservation/application/types/reservation-command-result.types';

@CommandHandler(UpdateReservationCommand)
export class UpdateReservationHandler
  implements ICommandHandler<UpdateReservationCommand>
{
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly repository: IReservationRepository,
    @Inject(ReservationEventPublisherPort)
    private readonly eventPublisher: ReservationEventPublisherPort,
    private readonly resourceLoader: CreateReservationResourceLoaderService,
  ) {}

  async execute(
    command: UpdateReservationCommand,
  ): Promise<ReservationCommandMessageResult> {
    const { reservationId, creatorId, updateReservationDto } = command;

    const reservationEntity =
      await this.repository.findReservationById(reservationId);
    if (!reservationEntity) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }

    if (typeof reservationEntity.creator === 'string') {
      throw new BadRequestException('예약 생성자 정보가 존재하지 않습니다.');
    }
    if (reservationEntity.creator.memberId !== creatorId) {
      throw new ForbiddenException('예약을 수정할 권한이 없습니다.');
    }

    const currentDate = AppKstDateTime.kstCalendarYmdFromDbOrString(
      reservationEntity.date,
    );
    const newDate = updateReservationDto.date;

    if (!ReservationTimeUtil.canModifyReservation(currentDate, newDate)) {
      throw new ForbiddenException(
        '예약 수정은 전날 22:00(KST)까지 가능합니다.',
      );
    }

    const previousParticipatorIds = reservationEntity.participators.map(
      (p) => p.memberId,
    );

    if (updateReservationDto.title) {
      reservationEntity.rename(updateReservationDto.title);
    }

    if (updateReservationDto.date !== undefined) {
      reservationEntity.updateDate(
        AppKstDateTime.dateFormmatForDB(updateReservationDto.date),
      );
    }

    if (updateReservationDto.startTime || updateReservationDto.endTime) {
      const start = updateReservationDto.startTime
        ? AppKstDateTime.normalizeReservationTimeToHHmm(updateReservationDto.startTime)
        : reservationEntity.startTime;
      const end = updateReservationDto.endTime
        ? AppKstDateTime.normalizeReservationTimeToHHmm(updateReservationDto.endTime)
        : reservationEntity.endTime;
      reservationEntity.updateTime(start, end);
    }

    if (updateReservationDto.reservationType !== undefined) {
      reservationEntity.updateReservationType(
        updateReservationDto.reservationType,
      );
    }

    if (updateReservationDto.participationAvailable !== undefined) {
      reservationEntity.updateParticipationAvailable(
        updateReservationDto.participationAvailable,
      );
    }

    if (updateReservationDto.participatorIds !== undefined) {
      reservationEntity.excludeParticipators(reservationEntity.participators);
      if (updateReservationDto.participatorIds.length > 0) {
        const newParticipators = await this.resourceLoader.loadParticipatorsById(
          updateReservationDto.participatorIds,
        );
        reservationEntity.addParticipators(newParticipators);
      }
    } else {
      if (updateReservationDto.removedParticipatorIds?.length) {
        const toRemove = reservationEntity.participators.filter((p) =>
          updateReservationDto.removedParticipatorIds!.includes(p.memberId),
        );
        reservationEntity.excludeParticipators(toRemove);
      }

      if (updateReservationDto.addedParticipatorIds?.length) {
        const newParticipators = await this.resourceLoader.loadParticipatorsById(
          updateReservationDto.addedParticipatorIds,
        );
        reservationEntity.addParticipators(newParticipators);
      }
    }

    if (updateReservationDto.borrowInstrumentIds !== undefined) {
      reservationEntity.excludeBorrowInstruments(
        reservationEntity.borrowInstruments,
      );
      if (updateReservationDto.borrowInstrumentIds.length > 0) {
        const newBorrowInstruments =
          await this.resourceLoader.loadBorrowInstruments(
            updateReservationDto.borrowInstrumentIds,
          );
        reservationEntity.addBorrowInstruments(newBorrowInstruments);
      }
    } else {
      if (updateReservationDto.removedBorrowInstrumentIds?.length) {
        const toRemove = reservationEntity.borrowInstruments.filter((b) =>
          updateReservationDto.removedBorrowInstrumentIds!.includes(
            b.instrumentId,
          ),
        );
        reservationEntity.excludeBorrowInstruments(toRemove);
      }

      if (updateReservationDto.addedBorrowInstrumentIds?.length) {
        const newBorrowInstruments =
          await this.resourceLoader.loadBorrowInstruments(
            updateReservationDto.addedBorrowInstrumentIds,
          );
        reservationEntity.addBorrowInstruments(newBorrowInstruments);
      }
    }

    const conflictDate = AppKstDateTime.kstCalendarYmdFromDbOrString(
      reservationEntity.date,
    );

    const savedReservation = await this.repository.transaction(async (tx) => {
      if (
        updateReservationDto.date !== undefined ||
        updateReservationDto.startTime ||
        updateReservationDto.endTime
      ) {
        const hasOverlap = await this.repository.someConflictReservation(
          {
            date: conflictDate,
            startTime: reservationEntity.startTime,
            endTime: reservationEntity.endTime,
            notIncludeId: reservationId,
          },
          tx,
        );

        if (hasOverlap) {
          throw new ConflictException(
            '이미 해당 시간에 다른 예약이 존재합니다.',
          );
        }
      }

      return await this.repository.save(reservationEntity, tx);
    });

    if (typeof savedReservation.creator === 'string') {
      throw new BadRequestException('예약 생성자 정보가 존재하지 않습니다.');
    }

    const changes: Record<string, unknown> = {};
    if (updateReservationDto.title) changes.title = updateReservationDto.title;
    if (updateReservationDto.date !== undefined)
      changes.date = updateReservationDto.date;
    if (updateReservationDto.startTime)
      changes.startTime = updateReservationDto.startTime;
    if (updateReservationDto.endTime)
      changes.endTime = updateReservationDto.endTime;
    if (updateReservationDto.reservationType !== undefined)
      changes.reservationType = updateReservationDto.reservationType;
    if (updateReservationDto.participationAvailable !== undefined)
      changes.participationAvailable =
        updateReservationDto.participationAvailable;
    if (updateReservationDto.participatorIds !== undefined)
      changes.participatorIds = updateReservationDto.participatorIds;
    if (updateReservationDto.borrowInstrumentIds !== undefined)
      changes.borrowInstrumentIds = updateReservationDto.borrowInstrumentIds;
    if (updateReservationDto.addedParticipatorIds?.length)
      changes.addedParticipators = updateReservationDto.addedParticipatorIds;
    if (updateReservationDto.removedParticipatorIds?.length)
      changes.removedParticipators =
        updateReservationDto.removedParticipatorIds;
    if (updateReservationDto.addedBorrowInstrumentIds?.length)
      changes.addedBorrowInstruments =
        updateReservationDto.addedBorrowInstrumentIds;
    if (updateReservationDto.removedBorrowInstrumentIds?.length)
      changes.removedBorrowInstruments =
        updateReservationDto.removedBorrowInstrumentIds;

    const removedByFullReplace =
      updateReservationDto.participatorIds !== undefined
        ? previousParticipatorIds.filter(
            (id) => !updateReservationDto.participatorIds!.includes(id),
          )
        : [];

    const affectedMemberIds = [
      ...new Set([
        ...savedReservation.participators.map((p) => p.memberId),
        ...(updateReservationDto.removedParticipatorIds ?? []),
        ...removedByFullReplace,
      ]),
    ].filter((id) => id !== creatorId);

    if (Object.keys(changes).length > 0 && affectedMemberIds.length > 0) {
      await this.eventPublisher.sendReservationUpdatedNotification({
        reservationId,
        updatedBy: creatorId,
        changes,
        affectedMemberIds,
        reservationTitle: savedReservation.title,
      });
    }

    return { message: '예약이 성공적으로 수정되었습니다.' };
  }
}
