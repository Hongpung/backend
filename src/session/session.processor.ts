import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { NotificationService } from 'src/notification/notification.service';
import { josa } from 'es-hangul';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Processor('session')
export class SessionProcessor {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    @Process('force-end-session')
    async handleForceEndSession(job: Job<ReservationSessionJson | RealtimeSessionJson>) {

        console.log('called force-end')
        this.eventEmitter.emit('force-end-session')

        const sessionData = job.data as ReservationSessionJson | RealtimeSessionJson;

        if (sessionData.sessionType == 'RESERVED' && sessionData.reservationType == 'EXTERNAL') return;

        console.log(job.data.attendanceList)
        await this.notificationService.sendPushNotifications({
            to: sessionData.attendanceList.map(({ user, ...attendance }) => { console.log(user.memberId); return (user.memberId) }),
            title: '연습실 이용 안내',
            body: josa(sessionData.title.length > 10 ? sessionData.title.substring(0, 10) + '...' : sessionData.title, '이/가') + ' 시간 제한에 의해 종료 되었습니다.\n다음부터는 시간을 준수해주세요.'
        })

        console.log(`Sending notification for reservation: ${sessionData.title}`);
    }

    @Process('force-end-alarm')
    async handleForceEndAlarm(job: Job<ReservationSessionJson | RealtimeSessionJson>) {

        console.log('called force-end-alarm')

        const sessionData = job.data as ReservationSessionJson | RealtimeSessionJson;

        if (sessionData.sessionType == 'RESERVED' && sessionData.reservationType == 'EXTERNAL') return;

        await this.notificationService.sendPushNotifications({
            to: sessionData.attendanceList.filter(({ status, ...attendance }) => { return (status !== '결석') }).map(({ user, status, ...attendance }) => (user.memberId)),
            title: '연습실 이용 안내',
            body: josa(sessionData.title.length > 10 ? sessionData.title.substring(0, 10) + '...' : sessionData.title, '이/가') + '10분 뒤 종료됩니다.\n강제 종료되기 전에 정리 후 사진을 찍어요.'
        })

        console.log(`Sending notification for reservation: ${sessionData.title}`);
    }

    @Process('start-external-reservation')
    async handleExternalReservationSession(job: Job<ReservationSessionJson>) {

        console.log('called start-external-reservation')

        this.eventEmitter.emit('start-external-reservation')
    }


    @Process('discard-reservation-session')
    async discardReservationSession(job: Job<ReservationSessionJson>) {


        const sessionData = job.data as ReservationSessionJson;

        if (sessionData.reservationType == 'EXTERNAL') return;

        this.eventEmitter.emit('discard-reservation-session')
        
        console.log('canceled:', sessionData.title)

        await this.notificationService.sendPushNotifications({
            to: sessionData.attendanceList.map(({ user, ...attendance }) => { console.log(user.memberId); return (user.memberId) }),
            title: '연습 취소 안내',
            body: josa(sessionData.title.length > 10 ? sessionData.title.substring(0, 10) + '...' : sessionData.title, '이/가') + ' 시간 내 미시작 의해 취소 되었습니다.\n다음부터는 시작 시간을 준수해주세요.'
        })
    }
}