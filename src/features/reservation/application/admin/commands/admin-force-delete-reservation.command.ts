import { ICommand } from '@nestjs/cqrs';

/**
 * 관리자 예약 강제 삭제 Command
 */
export class AdminForceDeleteReservationCommand implements ICommand {
  constructor(
    public readonly reservationId: number,
    public readonly adminId: number,
  ) {}
}
