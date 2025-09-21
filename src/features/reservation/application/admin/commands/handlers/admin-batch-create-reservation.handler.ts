import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  Inject,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AdminBatchCreateReservationCommand } from '../admin-batch-create-reservation.command';
import type { ReservationType } from 'src/features/reservation/reservation.types';
import { isPersistenceValidationError } from 'src/common/persistence/persistence-error.util';
import {
  ReservationRepositoryPort,
  IReservationRepository,
  TransactionClient,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { CreateReservationResourceLoaderService } from 'src/features/reservation/application/user/services/create-reservation-resource-loader.service';
import { ReservationEventPublisherPort } from 'src/features/reservation/application/ports/out/reservation-event-publisher.port';
import { ReservationAdminLookupPort } from 'src/features/reservation/application/ports/out/reservation-admin-lookup.port';
import type { ReservationCommandMessageResult } from 'src/features/reservation/application/types/reservation-command-result.types';

type BatchOption = {
  title: string;
  reservationType: ReservationType;
  creatorName?: string;
  creatorId?: number;
};

type OverlapCancelledNotification = {
  reservationId: number;
  title: string;
  participatorIds: number[];
};

@CommandHandler(AdminBatchCreateReservationCommand)
export class AdminBatchCreateReservationHandler
  implements ICommandHandler<AdminBatchCreateReservationCommand>
{
  private readonly logger = new Logger(AdminBatchCreateReservationHandler.name);

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
    command: AdminBatchCreateReservationCommand,
  ): Promise<ReservationCommandMessageResult> {
    const { adminId, batchReservationDTO } = command;

    const admin = await this.adminLookup.requireSuperAdmin(adminId);

    const {
      dayTimes: dates,
      duration,
      batchReservationOption,
    } = batchReservationDTO;
    const { startDate, endDate } = duration;

    const dayMap: Record<string, number> = {
      일: 0,
      월: 1,
      화: 2,
      수: 3,
      목: 4,
      금: 5,
      토: 6,
    };

    const option: Record<string, string | number> = {
      createdAdminName: admin.name,
      reservationType: batchReservationOption.reservationType,
      title: batchReservationOption.title,
    };

    if (batchReservationOption.reservationType === 'EXTERNAL') {
      option.creatorName = batchReservationOption.creatorName;
    } else {
      option.creatorId = batchReservationOption.creatorId!;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const overlapCancelledNotifications: OverlapCancelledNotification[] = [];

    try {
      const result = await this.repository.transaction(async (tx) => {
        const currentDate = new Date(start);

        while (currentDate <= end) {
          const currentDay = currentDate.getDay();
          const dayReservation = dates.find(
            (d) => dayMap[d.day] === currentDay,
          );

          if (dayReservation) {
            const { startTime, endTime } = dayReservation;
            const dateYmd = AppKstDateTime.kstCalendarYmdFromDbOrString(
              currentDate,
            );
            const reservationDate = AppKstDateTime.dateFormmatForDB(dateYmd);

            const overlappingReservations =
              await this.repository.findConflictReservations(
                {
                  date: dateYmd,
                  startTime,
                  endTime,
                },
                tx,
              );

            if (overlappingReservations.length > 0) {
              const reservationsInfo = await Promise.all(
                overlappingReservations.map((res) =>
                  this.repository.findReservationById(res.reservationId, tx),
                ),
              );

              await this.repository.deleteManyReservations(
                {
                  reservationId: {
                    in: overlappingReservations.map((res) => res.reservationId),
                  },
                },
                tx,
              );

              for (const res of reservationsInfo) {
                if (res && res.participators.length > 0) {
                  overlapCancelledNotifications.push({
                    reservationId: res.reservationId!,
                    title: res.title,
                    participatorIds: res.participators.map((p) => p.memberId),
                  });
                }
              }
            }

            if (batchReservationOption.reservationType === 'EXTERNAL') {
              await this.saveExternalBatchSlot(
                tx,
                batchReservationOption as BatchOption & {
                  reservationType: 'EXTERNAL';
                },
                reservationDate,
                startTime,
                endTime,
              );
            } else {
              await this.saveRegularOrCommonBatchSlot(
                tx,
                batchReservationOption as BatchOption & {
                  reservationType: 'REGULAR' | 'COMMON';
                },
                reservationDate,
                startTime,
                endTime,
              );
            }
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        return { message: 'Routine reservations registered successfully' };
      });

      for (const notification of overlapCancelledNotifications) {
        void this.eventPublisher.sendAdminBatchOverlapCancelledNotification(
          notification,
        );
      }

      return result;
    } catch (error: unknown) {
      if (isPersistenceValidationError(error)) {
        throw new BadRequestException('잘못된 요청 데이터입니다.');
      }

      this.logger.error('Unhandled batch reservation error:', error);
      throw new InternalServerErrorException(
        '예약 업데이트 중 알 수 없는 에러가 발생했습니다.',
      );
    }
  }

  private async saveExternalBatchSlot(
    tx: TransactionClient,
    option: BatchOption & { reservationType: 'EXTERNAL' },
    reservationDate: Date,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    const externalName = option.creatorName?.trim();
    if (!externalName) {
      throw new BadRequestException(
        'EXTERNAL 일괄 예약에는 creatorName(외부 생성자 표시명)이 필요합니다.',
      );
    }

    const entity = ReservationEntity.create({
      date: reservationDate,
      startTime,
      endTime,
      title: option.title,
      reservationType: 'EXTERNAL',
      participationAvailable: false,
      creator: externalName,
      participators: [],
      borrowInstruments: [],
    });

    await this.repository.save(entity, tx);
  }

  private async saveRegularOrCommonBatchSlot(
    tx: TransactionClient,
    option: BatchOption & { reservationType: 'REGULAR' | 'COMMON' },
    reservationDate: Date,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    const creatorId = option.creatorId;
    if (creatorId == null) {
      throw new BadRequestException(
        'REGULAR·COMMON 일괄 예약에는 creatorId가 필요합니다.',
      );
    }

    const { creator, participators } =
      await this.resourceLoader.loadCreatorAndParticipators(creatorId, [
        creatorId,
      ]);

    const entity = ReservationEntity.create({
      date: reservationDate,
      startTime,
      endTime,
      title: option.title,
      reservationType: option.reservationType,
      participationAvailable: false,
      creator,
      participators,
      borrowInstruments: [],
    });

    const createdReservation = await this.repository.save(entity, tx);

    void this.eventPublisher.sendAdminBatchInviteNotification({
      reservationId: createdReservation.reservationId!,
      title: option.title,
      participatorIds: [creatorId],
    });
  }
}
