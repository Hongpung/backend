import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ReservationAdminCommandUseCasePort } from '../../ports/in/reservation-admin-command.use-case.port';
import { ReservationAdminCommandMapper } from '../mappers/reservation-admin-command.mapper';

@Injectable()
export class ReservationAdminService
  implements ReservationAdminCommandUseCasePort
{
  constructor(private readonly commandBus: CommandBus) {}

  async forceCreateReservation(
    ...args: Parameters<
      ReservationAdminCommandUseCasePort['forceCreateReservation']
    >
  ): Promise<unknown> {
    return this.commandBus.execute(
      ReservationAdminCommandMapper.toForceCreateCommand(...args),
    );
  }

  async forceDeleteReservation(
    ...args: Parameters<
      ReservationAdminCommandUseCasePort['forceDeleteReservation']
    >
  ): Promise<unknown> {
    return this.commandBus.execute(
      ReservationAdminCommandMapper.toForceDeleteCommand(...args),
    );
  }

  async modifyReservation(
    ...args: Parameters<ReservationAdminCommandUseCasePort['modifyReservation']>
  ): Promise<unknown> {
    return this.commandBus.execute(
      ReservationAdminCommandMapper.toModifyCommand(...args),
    );
  }

  async batchCreateReservations(
    ...args: Parameters<
      ReservationAdminCommandUseCasePort['batchCreateReservations']
    >
  ): Promise<unknown> {
    return this.commandBus.execute(
      ReservationAdminCommandMapper.toBatchCreateCommand(...args),
    );
  }
}
