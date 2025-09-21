import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ReservationTimeUtil } from 'src/features/reservation/reservation.utils';
import {
  IReservationRepository,
  TransactionClient,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';

@Injectable()
export class CreateReservationPolicyService {
  validateDeadline(date: string): void {
    if (!ReservationTimeUtil.canMakeReservation(date)) {
      throw new ForbiddenException('예약은 전날 22:00(KST)까지 가능합니다.');
    }
  }

  async assertNoConflict(
    repository: IReservationRepository,
    options: { date: string; startTime: string; endTime: string },
    tx?: TransactionClient,
  ): Promise<void> {
    const hasOverlapReservation = await repository.someConflictReservation(
      options,
      tx,
    );
    if (hasOverlapReservation) {
      throw new ConflictException('이미 해당 시간에 예약이 존재합니다.');
    }
  }
}
