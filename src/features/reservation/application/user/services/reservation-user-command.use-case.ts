import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CreateReservationCommand } from '../commands/create-reservation.command';
import { DeleteReservationCommand } from '../commands/delete-reservation.command';
import { LeaveReservationCommand } from '../commands/leave-reservation.command';
import { UpdateReservationCommand } from '../commands/update-reservation.command';
import type {
  CreateReservationInput,
  UpdateReservationInput,
} from 'src/features/reservation/application/ports/in/reservation-user-command.types';
import { ReservationUserCommandUseCasePort } from '../../ports/in/reservation-user-command.use-case.port';

@Injectable()
export class ReservationUserCommandUseCase
  implements ReservationUserCommandUseCasePort
{
  constructor(private readonly commandBus: CommandBus) {}

  async createReservation(params: {
    input: CreateReservationInput;
    memberId: number;
  }): Promise<void> {
    return await this.commandBus.execute(
      new CreateReservationCommand(params.input, params.memberId),
    );
  }

  async updateReservation(params: {
    reservationId: number;
    creatorId: number;
    input: UpdateReservationInput;
  }): Promise<void> {
    return await this.commandBus.execute(
      new UpdateReservationCommand(
        params.reservationId,
        params.creatorId,
        params.input,
      ),
    );
  }

  async leaveReservation(params: {
    reservationId: number;
    memberId: number;
  }): Promise<void> {
    return await this.commandBus.execute(
      new LeaveReservationCommand(params.reservationId, params.memberId),
    );
  }

  async deleteReservation(params: {
    reservationId: number;
    creatorId: number;
  }): Promise<void> {
    return await this.commandBus.execute(
      new DeleteReservationCommand(params.reservationId, params.creatorId),
    );
  }
}
