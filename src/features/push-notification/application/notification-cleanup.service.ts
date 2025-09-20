import { Inject, Injectable, Logger } from '@nestjs/common';

import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

import {

  INotificationRepository,

  NotificationRepositoryPort,

} from './ports/out/notification.repository.port';



export const READ_NOTIFICATION_RETENTION_DAYS = 10;



@Injectable()

export class NotificationCleanupService {

  private readonly logger = new Logger(NotificationCleanupService.name);



  constructor(

    @Inject(NotificationRepositoryPort)

    private readonly repository: INotificationRepository,

  ) {}



  async cleanupReadNotifications(): Promise<{ count: number }> {

    const nowAnchor = AppKstDateTime.getNowKoreanTime();

    const cutoff = new Date(nowAnchor);

    cutoff.setUTCDate(cutoff.getUTCDate() - READ_NOTIFICATION_RETENTION_DAYS);

    const { count } =

      await this.repository.deleteReadNotificationsOlderThan(cutoff);

    this.logger.log(

      `Read notifications deleted (older than ${READ_NOTIFICATION_RETENTION_DAYS} days): ${count}`,

    );

    return { count };

  }

}

