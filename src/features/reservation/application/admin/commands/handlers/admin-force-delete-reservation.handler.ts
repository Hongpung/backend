import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { AdminForceDeleteReservationCommand } from '../admin-force-delete-reservation.command';
import {
  ReservationRepositoryPort,
  IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { ReservationEventPublisherPort } from 'src/features/reservation/application/ports/out/reservation-event-publisher.port';
import { isPersistenceRecordNotFoundError } from 'src/common/persistence/persistence-error.util';
import { ReservationAdminLookupPort } from 'src/features/reservation/application/ports/out/reservation-admin-lookup.port';
import type { ReservationCommandMessageResult } from 'src/features/reservation/application/types/reservation-command-result.types';

@CommandHandler(AdminForceDeleteReservationCommand)
export class AdminForceDeleteReservationHandler
  implements ICommandHandler<AdminForceDeleteReservationCommand>
{
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly repository: IReservationRepository,
    @Inject(ReservationEventPublisherPort)
    private readonly eventPublisher: ReservationEventPublisherPort,
    @Inject(ReservationAdminLookupPort)
    private readonly adminLookup: ReservationAdminLookupPort,
  ) {}

  async execute(
    command: AdminForceDeleteReservationCommand,
  ): Promise<ReservationCommandMessageResult> {
    const { reservationId, adminId } = command;

    try {
      await this.adminLookup.requireAdmin(adminId);

      const reservationBeforeDelete =
        await this.repository.findReservationById(reservationId);

      if (!reservationBeforeDelete) {
        throw new NotFoundException('해당 예약을 찾을 수 없습니다.');
      }

      await this.repository.delete(reservationId);

      const participatorIds = reservationBeforeDelete.participators.map(
        (p) => p.memberId,
      );
      if (participatorIds.length > 0) {
        void this.eventPublisher.sendAdminForceCancelledNotification({
          reservationId,
          title: reservationBeforeDelete.title,
          participatorIds,
        });
      }

      return { message: '삭제 성공' };
    } catch (error) {
      if (isPersistenceRecordNotFoundError(error)) {
        throw new NotFoundException('해당 예약을 찾을 수 없습니다.');
      }
      throw error;
    }
  }
}
