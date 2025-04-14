import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { NotificationService } from 'src/notification/notification.service';
import { josa } from 'es-hangul';
import { ReservationService } from './reservation.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Processor('reservation')
export class ReservationProcessor {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly eventEmmiter: EventEmitter2,
    ) { }

    @Process('sendUpcomingNotification')
    async handleSendUpcomingNotification(job: Job) {
        const reservation = await job.data as ReservationDTO;
        this.notificationService.sendPushNotifications({
            to: reservation.participators.map(user => { console.log(user.memberId); return (user.memberId) }),
            title: '연습실 이용 안내',
            body: josa(reservation.message.length > 10 ? reservation.message.substring(0, 10) + '...' : reservation.message, '이/가') + ' 15분뒤 예정되어 있습니다.\n늦지 않게 시작해주시길 바랍니다.'
        })
        console.log(`Sending notification for reservation: ${reservation.message}`);
    }

    @Process('start-external-reservation')
    async haddleForceStartSession() {
        this.eventEmmiter.emit('start-external-reservation')
    }
}