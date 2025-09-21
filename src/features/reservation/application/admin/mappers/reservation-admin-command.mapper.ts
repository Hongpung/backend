import { AdminBatchCreateReservationCommand } from '../commands/admin-batch-create-reservation.command';
import { AdminForceCreateReservationCommand } from '../commands/admin-force-create-reservation.command';
import { AdminForceDeleteReservationCommand } from '../commands/admin-force-delete-reservation.command';
import { AdminModifyReservationCommand } from '../commands/admin-modify-reservation.command';
import type {
  BatchReservationInput,
  ForceCreateReservationInput,
  ForceUpdateReservationInput,
} from '../../ports/in/reservation-user-command.types';
import type { ReservationType } from 'src/features/reservation/reservation.types';

/**
 * 유즈케이스 입력 → CQRS Command (Application 내부 orchestration).
 * HTTP DTO 매핑은 infrastructure/in/controllers/mappers/reservation-controller.request.mapper 가 담당.
 */
export class ReservationAdminCommandMapper {
  static toForceCreateCommand(
    input: ForceCreateReservationInput,
    adminId: number,
  ): AdminForceCreateReservationCommand {
    return new AdminForceCreateReservationCommand(input, adminId);
  }

  static toForceDeleteCommand(
    reservationId: number,
    adminId: number,
  ): AdminForceDeleteReservationCommand {
    return new AdminForceDeleteReservationCommand(reservationId, adminId);
  }

  static toModifyCommand(
    reservationId: number,
    adminId: number,
    input: ForceUpdateReservationInput,
  ): AdminModifyReservationCommand {
    return new AdminModifyReservationCommand(reservationId, adminId, input);
  }

  static toBatchCreateCommand(
    adminId: number,
    batchInput: BatchReservationInput<ReservationType>,
  ): AdminBatchCreateReservationCommand {
    return new AdminBatchCreateReservationCommand(adminId, batchInput);
  }
}
