import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { NotificationService } from 'src/notification/notification.service';
import { josa } from 'es-hangul';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Processor('reservation')
export class ReservationProcessor {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly eventEmmiter: EventEmitter2,
    ) { }

    @Process('sendUpcomingNotification')
    async handleSendUpcomingNotification(job: Job<ReservationDTO>) {
        try {
            const reservation = job.data;
            if (!reservation?.participators?.length)
                return;
            const message = reservation.message ?? reservation.title ?? '예약';
            const text = typeof message === 'string' && message.length > 10 ? message.substring(0, 10) + '...' : String(message);
            await this.notificationService.sendPushNotifications({
                to: reservation.participators.map((user) => user.memberId),
                title: '연습실 이용 안내',
                body: josa(text, '이/가') + ' 15분뒤 예정되어 있습니다.\n늦지 않게 시작해주시길 바랍니다.',
            });
        } catch (err) {
            throw err;
        }
    }

    @Process('start-external-reservation')
    async haddleForceStartSession() {
        this.eventEmmiter.emit('start-external-reservation')
    }
}