import { ICommand } from '@nestjs/cqrs';
import { BatchReservationInput } from 'src/features/reservation/application/ports/in/reservation-user-command.types';
import { ReservationType } from 'src/features/reservation/reservation.types';

/**
 * 관리자 일괄 예약 생성 Command
 */
export class AdminBatchCreateReservationCommand implements ICommand {
  constructor(
    public readonly adminId: number,
    public readonly batchReservationDTO: BatchReservationInput<ReservationType>,
  ) {}
}
