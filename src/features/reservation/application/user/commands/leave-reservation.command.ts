import { ICommand } from '@nestjs/cqrs';

/**
 * 예약 탈퇴 Command
 */
export class LeaveReservationCommand implements ICommand {
  constructor(
    public readonly reservationId: number,
    public readonly memberId: number,
  ) {}
}
