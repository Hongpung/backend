import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { EventEmitterReadinessWatcher } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { ReservationRemindNotificationService } from 'src/features/reservation/application/services/reservation-remind-notification.service';

/**
 * 예약 리마인드 알림(아침·전일)만 담당한다.
 * 세션 리스트·15분 전·노쇼·외부 시작은 session 스케줄러가 담당한다.
 */
@Injectable()
export class ReservationSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ReservationSchedulerService.name);

  constructor(
    private readonly reservationRemindNotification: ReservationRemindNotificationService,
    private readonly eventEmitterReadinessWatcher: EventEmitterReadinessWatcher,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.eventEmitterReadinessWatcher.waitUntilReady();
    this.logger.log('Reservation remind scheduler ready.');
  }

  @Cron('0 0 9 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async sendMorningRemindNotification(): Promise<void> {
    await this.reservationRemindNotification.sendMorningRemindersForToday();
  }

  @Cron('0 0 21 * * *', {
    timeZone: 'Asia/Seoul',
  })
  async sendNextDayReservationsRemindNotification(): Promise<void> {
    await this.reservationRemindNotification.sendNextDayReminders();
  }
}
