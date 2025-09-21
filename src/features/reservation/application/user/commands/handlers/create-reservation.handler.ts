import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateReservationCommand } from '../create-reservation.command';
import {
  ReservationRepositoryPort,
  IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { CreateReservationPolicyService } from '../../services/create-reservation-policy.service';
import { CreateReservationResourceLoaderService } from '../../services/create-reservation-resource-loader.service';
import { ReservationCreatedEventPublisherService } from '../../services/reservation-created-event-publisher.service';
import type { ReservationCreatedCommandResult } from 'src/features/reservation/application/types/reservation-command-result.types';

@CommandHandler(CreateReservationCommand)
export class CreateReservationHandler
  implements ICommandHandler<CreateReservationCommand>
{
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly repository: IReservationRepository,
    private readonly policyService: CreateReservationPolicyService,
    private readonly resourceLoader: CreateReservationResourceLoaderService,
    private readonly eventPublisher: ReservationCreatedEventPublisherService,
  ) {}

  async execute(
    command: CreateReservationCommand,
  ): Promise<ReservationCreatedCommandResult> {
    const { createReservationDto, memberId } = command;
    const {
      date,
      startTime,
      endTime,
      title,
      participatorIds,
      borrowInstrumentIds,
      participationAvailable,
      reservationType,
    } = createReservationDto;

    this.policyService.validateDeadline(date);

    const reservedDate = AppKstDateTime.dateFormmatForDB(date);
    const start = AppKstDateTime.normalizeReservationTimeToHHmm(startTime);
    const end = AppKstDateTime.normalizeReservationTimeToHHmm(endTime);

    const savedReservation = await this.repository.transaction(async (tx) => {
      await this.policyService.assertNoConflict(
        this.repository,
        { date, endTime, startTime },
        tx,
      );

      const { creator, participators } =
        await this.resourceLoader.loadCreatorAndParticipators(
          memberId,
          participatorIds,
        );

      const borrowInstruments =
        await this.resourceLoader.loadBorrowInstruments(borrowInstrumentIds);

      const reservationEntity = ReservationEntity.create({
        date: reservedDate,
        startTime: start,
        endTime: end,
        title,
        reservationType,
        participationAvailable,
        creator,
        participators,
        borrowInstruments,
      });

      return await this.repository.save(reservationEntity, tx);
    });

    this.eventPublisher.publishCreated(
      savedReservation.reservationId!,
      memberId,
      title,
      participatorIds,
    );

    return { reservationId: savedReservation.reservationId };
  }
}
