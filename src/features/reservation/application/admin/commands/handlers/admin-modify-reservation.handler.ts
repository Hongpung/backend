import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminModifyReservationCommand } from '../admin-modify-reservation.command';
import {
  ReservationRepositoryPort,
  IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { CreateReservationResourceLoaderService } from 'src/features/reservation/application/user/services/create-reservation-resource-loader.service';
import { ReservationEventPublisherPort } from 'src/features/reservation/application/ports/out/reservation-event-publisher.port';
import { ReservationAdminLookupPort } from 'src/features/reservation/application/ports/out/reservation-admin-lookup.port';
import type { AdminModifyReservationCommandResult } from 'src/features/reservation/application/types/reservation-command-result.types';

@CommandHandler(AdminModifyReservationCommand)
export class AdminModifyReservationHandler
  implements ICommandHandler<AdminModifyReservationCommand>
{
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly repository: IReservationRepository,
    @Inject(ReservationEventPublisherPort)
    private readonly eventPublisher: ReservationEventPublisherPort,
    @Inject(ReservationAdminLookupPort)
    private readonly adminLookup: ReservationAdminLookupPort,
    private readonly resourceLoader: CreateReservationResourceLoaderService,
  ) {}

  async execute(
    command: AdminModifyReservationCommand,
  ): Promise<AdminModifyReservationCommandResult> {
    const { reservationId, adminId, updateReservationDto } = command;

    await this.adminLookup.requireAdmin(adminId);

    const reservation =
      await this.repository.findReservationById(reservationId);
    if (!reservation) {
      throw new NotFoundException('해당 예약을 찾을 수 없습니다.');
    }

    const {
      date,
      startTime,
      endTime,
      title,
      participatorIds,
      borrowInstrumentIds,
      participationAvailable,
      externalCreatorName,
      creatorId,
      reservationType,
    } = updateReservationDto;

    if (title) {
      reservation.rename(title);
    }

    if (date) {
      reservation.updateDate(AppKstDateTime.dateFormmatForDB(date));
    }

    if (startTime || endTime) {
      const newStart = startTime
        ? AppKstDateTime.normalizeReservationTimeToHHmm(startTime)
        : reservation.startTime;
      const newEnd = endTime
        ? AppKstDateTime.normalizeReservationTimeToHHmm(endTime)
        : reservation.endTime;
      reservation.updateTime(newStart, newEnd);
    }

    const prevReservationType = reservation.reservationType;
    const nextReservationType = reservationType ?? prevReservationType;
    const isToExternal =
      prevReservationType !== 'EXTERNAL' && nextReservationType === 'EXTERNAL';
    const isToInternal =
      prevReservationType === 'EXTERNAL' && nextReservationType !== 'EXTERNAL';
    const shouldUpdateInternalCreator =
      typeof creatorId === 'number' && nextReservationType !== 'EXTERNAL';
    const shouldUpdateExternalCreator =
      typeof externalCreatorName === 'string' &&
      nextReservationType === 'EXTERNAL';

    if (reservationType !== undefined) {
      reservation.updateReservationType(reservationType);
    }

    if (isToExternal) {
      if (
        typeof externalCreatorName !== 'string' ||
        !externalCreatorName.trim()
      ) {
        throw new BadRequestException(
          'COMMON/REGULAR에서 EXTERNAL로 변경 시 externalCreatorName이 필요합니다.',
        );
      }
      reservation.updateCreator(externalCreatorName.trim());
    }

    if (isToInternal) {
      if (typeof creatorId !== 'number') {
        throw new BadRequestException(
          'EXTERNAL에서 COMMON/REGULAR로 변경 시 creatorId가 필요합니다.',
        );
      }
    }

    if (shouldUpdateInternalCreator) {
      const { creator } = await this.resourceLoader.loadCreatorAndParticipators(
        creatorId,
        [],
      );
      if (!creator) {
        throw new NotFoundException('creator를 찾을 수 없습니다.');
      }
      reservation.updateCreator(creator);
    }

    if (shouldUpdateExternalCreator) {
      if (!externalCreatorName.trim()) {
        throw new BadRequestException(
          'externalCreatorName은 빈 문자열일 수 없습니다.',
        );
      }
      reservation.updateCreator(externalCreatorName.trim());
    }

    if (participationAvailable !== undefined) {
      reservation.updateParticipationAvailable(participationAvailable);
    }

    if (participatorIds) {
      reservation.excludeParticipators(reservation.participators);
      const newParticipators =
        await this.resourceLoader.loadParticipatorsById(participatorIds);
      reservation.addParticipators(newParticipators);
    }

    if (borrowInstrumentIds) {
      reservation.excludeBorrowInstruments(reservation.borrowInstruments);
      const newBorrowInstruments =
        await this.resourceLoader.loadBorrowInstruments(borrowInstrumentIds, {
          strict: false,
        });
      reservation.addBorrowInstruments(newBorrowInstruments);
    }

    const conflictDate = AppKstDateTime.kstCalendarYmdFromDbOrString(
      reservation.date,
    );
    const conflictStartTime = reservation.startTime;
    const conflictEndTime = reservation.endTime;

    const { savedReservation, canceledConflicts } =
      await this.repository.transaction(async (tx) => {
        const overlappingReservations =
          await this.repository.findConflictReservations(
            {
              date: conflictDate,
              startTime: conflictStartTime,
              endTime: conflictEndTime,
              notIncludeId: reservationId,
            },
            tx,
          );

        const conflictEntities = (
          await Promise.all(
            overlappingReservations.map((res) =>
              this.repository.findReservationById(res.reservationId, tx),
            ),
          )
        ).filter((r): r is NonNullable<typeof r> => r != null);

        if (overlappingReservations.length > 0) {
          await this.repository.deleteManyReservations(
            {
              reservationId: {
                in: overlappingReservations.map((res) => res.reservationId),
              },
            },
            tx,
          );
        }

        const saved = await this.repository.save(reservation, tx);

        return {
          savedReservation: saved,
          canceledConflicts: conflictEntities.map((r) => ({
            reservationId: r.reservationId!,
            title: r.title,
            participatorIds: r.participators.map((p) => p.memberId),
          })),
        };
      });

    for (const conflict of canceledConflicts) {
      if (conflict.participatorIds.length === 0) continue;
      void this.eventPublisher.sendAdminConflictCancelledNotification({
        reservationId: conflict.reservationId,
        title: conflict.title,
        participatorIds: conflict.participatorIds,
      });
    }

    const changes: any = {};
    if (title) changes.title = title;
    if (date) changes.date = date;
    if (startTime) changes.startTime = startTime;
    if (endTime) changes.endTime = endTime;

    const affectedMemberIds = savedReservation.participators.map(
      (p) => p.memberId,
    );

    if (Object.keys(changes).length > 0 && affectedMemberIds.length > 0) {
      await this.eventPublisher.sendReservationUpdatedNotification({
        reservationId,
        updatedBy: adminId,
        changes,
        affectedMemberIds,
        reservationTitle: savedReservation.title,
      });
    }

    const canceledCount = canceledConflicts.length;
    const canceledSummary =
      canceledCount > 0
        ? ` 충돌 예약 ${canceledCount}건이 취소되었습니다.`
        : '';

    return {
      message: `예약이 성공적으로 수정되었습니다.${canceledSummary}`,
      canceledConflictReservations: canceledConflicts.map((conflict) => ({
        reservationId: conflict.reservationId,
        title: conflict.title,
      })),
    };
  }
}
