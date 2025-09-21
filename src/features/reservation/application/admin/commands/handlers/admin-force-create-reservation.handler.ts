import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  Inject,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AdminForceCreateReservationCommand } from '../admin-force-create-reservation.command';
import {
  ReservationRepositoryPort,
  IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import type { ReservationType } from 'src/features/reservation/reservation.types';
import type { ForceCreateReservationInput } from 'src/features/reservation/application/ports/in/reservation-user-command.types';
import { ReservationEventPublisherPort } from 'src/features/reservation/application/ports/out/reservation-event-publisher.port';
import { ReservationAdminLookupPort } from 'src/features/reservation/application/ports/out/reservation-admin-lookup.port';
import { CreateReservationResourceLoaderService } from 'src/features/reservation/application/user/services/create-reservation-resource-loader.service';
import type { ReservationCommandMessageResult } from 'src/features/reservation/application/types/reservation-command-result.types';

type OverlapCancelledNotification = {
  reservationId: number;
  title: string;
  participatorIds: number[];
};

@CommandHandler(AdminForceCreateReservationCommand)
export class AdminForceCreateReservationHandler
  implements ICommandHandler<AdminForceCreateReservationCommand>
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
    command: AdminForceCreateReservationCommand,
  ): Promise<ReservationCommandMessageResult> {
    const { createReservationDto, adminId } = command;

    await this.adminLookup.requireAdmin(adminId);

    const { date: selectedDate, startTime, endTime } = createReservationDto;
    const reservationDate = AppKstDateTime.dateFormmatForDB(selectedDate);

    if (reservationDate < new Date()) {
      throw new BadRequestException('유효한 날짜가 아닙니다.');
    }

    const newStart = AppKstDateTime.normalizeReservationTimeToHHmm(startTime);
    const newEnd = AppKstDateTime.normalizeReservationTimeToHHmm(endTime);

    const overlapCancelledNotifications: OverlapCancelledNotification[] = [];

    const result = await this.repository.transaction(async (tx) => {
      const overlappingReservations =
        await this.repository.findConflictReservations(
          { date: selectedDate, endTime, startTime },
          tx,
        );

      if (overlappingReservations.length > 0) {
        const reservationsInfo = (
          await Promise.all(
            overlappingReservations.map((res) =>
              this.repository.findReservationById(res.reservationId, tx),
            ),
          )
        ).filter((r): r is ReservationEntity => r != null);

        await this.repository.deleteManyReservations(
          {
            reservationId: {
              in: overlappingReservations.map((res) => res.reservationId),
            },
          },
          tx,
        );

        for (const reservation of reservationsInfo) {
          if (reservation.participators.length === 0) continue;
          overlapCancelledNotifications.push({
            reservationId: reservation.reservationId!,
            title: reservation.title,
            participatorIds: reservation.participators.map((p) => p.memberId),
          });
        }
      }

      const entity = await this.buildEntityForForceCreate(
        createReservationDto,
        reservationDate,
        newStart,
        newEnd,
        adminId,
      );

      await this.repository.save(entity, tx);

      return { message: '예약이 성공적으로 생성되었습니다.' };
    });

    for (const notification of overlapCancelledNotifications) {
      void this.eventPublisher.sendAdminForceCancelledNotification(notification);
    }

    return result;
  }

  private async loadCreatorForForceCreate(
    creatorMemberId: number,
    explicitCreatorId: number | null | undefined,
  ): Promise<ReservationCreator> {
    try {
      return await this.resourceLoader.loadCreator(creatorMemberId);
    } catch (error) {
      if (explicitCreatorId != null && error instanceof ForbiddenException) {
        throw new BadRequestException('생성자(회원) 정보를 찾을 수 없습니다.');
      }
      throw error;
    }
  }

  private async buildEntityForForceCreate(
    dto: ForceCreateReservationInput,
    reservationDate: Date,
    newStart: string,
    newEnd: string,
    adminId: number,
  ): Promise<ReservationEntity> {
    const { participationAvailable, reservationType, title } = dto;

    if (reservationType === 'EXTERNAL') {
      const label = dto.externalCreatorName?.trim();
      if (!label) {
        throw new BadRequestException(
          'EXTERNAL 예약에는 externalCreatorName이 필요합니다.',
        );
      }
      return ReservationEntity.create({
        date: reservationDate,
        startTime: newStart,
        endTime: newEnd,
        title,
        reservationType: 'EXTERNAL',
        participationAvailable,
        creator: label,
        participators: [],
        borrowInstruments: [],
      });
    }

    const creatorMemberId = dto.creatorId ?? adminId;
    const creator = await this.loadCreatorForForceCreate(
      creatorMemberId,
      dto.creatorId,
    );

    return ReservationEntity.create({
      date: reservationDate,
      startTime: newStart,
      endTime: newEnd,
      title,
      reservationType: reservationType as Exclude<ReservationType, 'EXTERNAL'>,
      participationAvailable,
      creator,
      participators: [],
      borrowInstruments: [],
    });
  }
}
