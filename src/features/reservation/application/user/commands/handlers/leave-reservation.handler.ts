import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { LeaveReservationCommand } from '../leave-reservation.command';
import {
  ReservationRepositoryPort,
  IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationEventPublisherPort } from 'src/features/reservation/application/ports/out/reservation-event-publisher.port';
import type { ReservationCommandMessageResult } from 'src/features/reservation/application/types/reservation-command-result.types';

@CommandHandler(LeaveReservationCommand)
export class LeaveReservationHandler
  implements ICommandHandler<LeaveReservationCommand>
{
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly repository: IReservationRepository,
    @Inject(ReservationEventPublisherPort)
    private readonly eventPublisher: ReservationEventPublisherPort,
  ) {}

  async execute(
    command: LeaveReservationCommand,
  ): Promise<ReservationCommandMessageResult> {
    const { reservationId, memberId } = command;

    const reservation =
      await this.repository.findReservationById(reservationId);
    if (!reservation) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }

    const participatorToRemove = reservation.participators.find(
      (p) => p.memberId === memberId,
    );
    if (!participatorToRemove) {
      throw new NotFoundException('해당 예약에 참여하고 있지 않습니다.');
    }

    if (
      reservation.creator instanceof ReservationCreator &&
      reservation.creator.memberId === memberId
    ) {
      throw new ForbiddenException(
        '예약 생성자는 예약을 나갈 수 없습니다. 예약을 삭제해주세요.',
      );
    }

    reservation.excludeParticipators([participatorToRemove]);
    await this.repository.save(reservation);

    if (reservation.creator instanceof ReservationCreator) {
      await this.eventPublisher.sendLeaveNotification(reservation, memberId);
    }

    return { message: '예약에서 제외됐어요.' };
  }
}
