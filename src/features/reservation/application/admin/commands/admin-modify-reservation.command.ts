import { ICommand } from '@nestjs/cqrs';
import { ForceUpdateReservationInput } from 'src/features/reservation/application/ports/in/reservation-user-command.types';

/**
 * 관리자 예약 수정 Command
 */
export class AdminModifyReservationCommand implements ICommand {
  constructor(
    public readonly reservationId: number,
    public readonly adminId: number,
    public readonly updateReservationDto: ForceUpdateReservationInput,
  ) {}
}
