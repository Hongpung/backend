import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';

export const ReservationSchedulerReadPort = Symbol(
  'ReservationSchedulerReadPort',
);

export interface ReservationSchedulerReadPort {
  findTodayForReminders(): Promise<ReservationEntity[]>;

  findTomorrowForReminders(): Promise<ReservationEntity[]>;
}
