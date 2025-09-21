import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeleteReservationCommand } from '../delete-reservation.command';
import {
  ReservationRepositoryPort,
  IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { ReservationEventPublisherPort } from 'src/features/reservation/application/ports/out/reservation-event-publisher.port';
import type { ReservationCommandMessageResult } from 'src/features/reservation/application/types/reservation-command-result.types';

@CommandHandler(DeleteReservationCommand)
export class DeleteReservationHandler
  implements ICommandHandler<DeleteReservationCommand>
{
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly repository: IReservationRepository,
    @Inject(ReservationEventPublisherPort)
    private readonly eventPublisher: ReservationEventPublisherPort,
  ) {}

  async execute(
    command: DeleteReservationCommand,
  ): Promise<ReservationCommandMessageResult> {
    const { reservationId, creatorId } = command;

    const reservation =
      await this.repository.findReservationById(reservationId);
    if (!reservation) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }

    if (
      typeof reservation.creator === 'string' ||
      reservation.creator.memberId !== creatorId
    ) {
      throw new ForbiddenException('예약을 삭제할 권한이 없습니다.');
    }

    const affectedMemberIds = reservation.participators
      .map((p) => p.memberId)
      .filter((id) => id !== creatorId);

    await this.repository.delete(reservationId);

    if (affectedMemberIds.length > 0) {
      await this.eventPublisher.sendReservationCanceledNotification(
        reservation,
        affectedMemberIds,
      );
    }

    return { message: '예약이 성공적으로 삭제되었어요.' };
  }
}
