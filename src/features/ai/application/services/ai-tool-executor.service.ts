import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  BatchReservationInput,
  ForceCreateReservationInput,
  ForceUpdateReservationInput,
} from 'src/features/reservation/application/ports/in/reservation-user-command.types';
import { ReservationAdminCommandUseCasePort } from 'src/features/reservation/application/ports/in/reservation-admin-command.use-case.port';
import type { ReservationType } from 'src/features/reservation/reservation.types';
import { isAiMutationToolName } from '../../domain/available-commands';
import { AiToolExecutorPort } from '../ports/out/ai.ports';

@Injectable()
export class AiToolExecutorService implements AiToolExecutorPort {
  constructor(
    @Inject(ReservationAdminCommandUseCasePort)
    private readonly reservationAdminCommands: ReservationAdminCommandUseCasePort,
  ) {}

  async execute(
    adminId: string,
    toolName: string,
    args: Record<string, unknown>,
    _idempotencyKey: string,
  ): Promise<unknown> {
    if (!isAiMutationToolName(toolName)) {
      throw new BadRequestException(`Unsupported AI tool: ${toolName}`);
    }

    const numericAdminId = this.parseAdminId(adminId);

    switch (toolName) {
      case 'reservation_force_create':
        return this.reservationAdminCommands.forceCreateReservation(
          args as unknown as ForceCreateReservationInput,
          numericAdminId,
        );
      case 'reservation_force_delete': {
        const reservationId = this.requireNumber(args, 'reservationId');
        return this.reservationAdminCommands.forceDeleteReservation(
          reservationId,
          numericAdminId,
        );
      }
      case 'reservation_modify': {
        const reservationId = this.requireNumber(args, 'reservationId');
        const { reservationId: _ignored, ...updateInput } = args;
        return this.reservationAdminCommands.modifyReservation(
          reservationId,
          numericAdminId,
          updateInput as ForceUpdateReservationInput,
        );
      }
      case 'reservation_batch_create':
        return this.reservationAdminCommands.batchCreateReservations(
          numericAdminId,
          args as unknown as BatchReservationInput<ReservationType>,
        );
      default:
        throw new BadRequestException(`Unsupported AI tool: ${toolName}`);
    }
  }

  private parseAdminId(adminId: string): number {
    const parsed = Number(adminId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('Invalid adminId');
    }
    return parsed;
  }

  private requireNumber(args: Record<string, unknown>, key: string): number {
    const value = Number(args[key]);
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(`${key} is required`);
    }
    return value;
  }
}
