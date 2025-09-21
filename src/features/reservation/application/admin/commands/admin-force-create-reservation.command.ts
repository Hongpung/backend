import { ICommand } from '@nestjs/cqrs';
import { ForceCreateReservationInput } from 'src/features/reservation/application/ports/in/reservation-user-command.types';

/**
 * 관리자 예약 강제 생성 Command
 */
export class AdminForceCreateReservationCommand implements ICommand {
  constructor(
    public readonly createReservationDto: ForceCreateReservationInput,
    public readonly adminId: number,
  ) {}
}
