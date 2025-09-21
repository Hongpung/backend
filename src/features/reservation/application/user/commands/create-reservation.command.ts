import { ICommand } from '@nestjs/cqrs';
import { CreateReservationInput } from 'src/features/reservation/application/ports/in/reservation-user-command.types';

/**
 * 예약 생성 Command
 */
export class CreateReservationCommand implements ICommand {
  constructor(
    public readonly createReservationDto: CreateReservationInput,
    public readonly memberId: number,
  ) {}
}
