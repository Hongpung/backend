import { ICommand } from '@nestjs/cqrs';
import { UpdateReservationInput } from 'src/features/reservation/application/ports/in/reservation-user-command.types';

/**
 * 예약 수정 Command
 */
export class UpdateReservationCommand implements ICommand {
  constructor(
    public readonly reservationId: number,
    public readonly creatorId: number,
    public readonly updateReservationDto: UpdateReservationInput,
  ) {}
}
