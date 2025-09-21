import { Inject, Injectable } from '@nestjs/common';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import {
  ReservationRepositoryPort,
  type IReservationRepository,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationSchedulerReadPort } from 'src/features/reservation/application/ports/out/reservation-scheduler-read.port';

@Injectable()
export class ReservationSchedulerReadAdapter implements ReservationSchedulerReadPort {
  constructor(
    @Inject(ReservationRepositoryPort)
    private readonly repository: IReservationRepository,
  ) {}

  async findTodayForReminders(): Promise<ReservationEntity[]> {
    const koreaDate = AppKstDateTime.todayDateAnchorForDb();
    return this.repository.findReservationsForSchedulerByDate(koreaDate);
  }

  async findTomorrowForReminders(): Promise<ReservationEntity[]> {
    const koreaDate = AppKstDateTime.tomorrowDateAnchorForDb();
    return this.repository.findReservationsForSchedulerByDate(koreaDate);
  }
}
