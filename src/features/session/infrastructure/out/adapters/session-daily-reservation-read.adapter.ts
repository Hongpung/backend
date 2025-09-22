import { Inject, Injectable } from '@nestjs/common';
import {
  ReservationSchedulerReadPort,
  type ReservationSchedulerReadPort as IReservationSchedulerReadPort,
} from 'src/features/reservation/application/ports/out/reservation-scheduler-read.port';
import { SessionDailyReservationReadPort } from '../../../application/ports/out/session-daily-reservation-read.port';
import type { SessionDailyReservationSyncPayload } from '../../../domain/read-models/session-daily-reservation-sync.read-model';
import { mapReservationsToDailyItems } from '../mappers/daily-reservation-item.mapper';

@Injectable()
export class SessionDailyReservationReadAdapter
  implements SessionDailyReservationReadPort
{
  constructor(
    @Inject(ReservationSchedulerReadPort)
    private readonly reservationSchedulerRead: IReservationSchedulerReadPort,
  ) {}

  async findTodayForSessionSync(): Promise<SessionDailyReservationSyncPayload> {
    const reservations =
      await this.reservationSchedulerRead.findTodayForReminders();

    return mapReservationsToDailyItems(reservations);
  }
}
