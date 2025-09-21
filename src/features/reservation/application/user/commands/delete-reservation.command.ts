import { ICommand } from '@nestjs/cqrs';

/**
 * 예약 삭제 Command
 */
export class DeleteReservationCommand implements ICommand {
  constructor(
    public readonly reservationId: number,
    public readonly creatorId: number,
  ) {}
}
