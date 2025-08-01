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
        this.eventEmitter.emit('force-end-session');

        const sessionData = job.data;
        if (!sessionData?.attendanceList?.length) return;
        if (sessionData.sessionType === 'RESERVED' && sessionData.reservationType === 'EXTERNAL') return;

        const title = sessionData.title ?? '연습';
        const titleText = title.length > 10 ? title.substring(0, 10) + '...' : title;
        await this.notificationService.sendPushNotifications({
            to: sessionData.attendanceList.map(({ user }) => user?.memberId).filter((id): id is number => id != null),
            title: '연습실 이용 안내',
            body: josa(titleText, '이/가') + ' 시간 제한에 의해 종료 되었습니다.\n다음부터는 시간을 준수해주세요.',
        });
    }

    @Process('force-end-alarm')
    async handleForceEndAlarm(job: Job<ReservationSessionJson | RealtimeSessionJson>) {
        const sessionData = job.data;
        if (!sessionData?.attendanceList?.length) return;
        if (sessionData.sessionType === 'RESERVED' && sessionData.reservationType === 'EXTERNAL') return;

        const toIds = sessionData.attendanceList
            .filter(({ status }) => status !== '결석')
            .map(({ user }) => user?.memberId)
            .filter((id): id is number => id != null);
        if (toIds.length === 0) return;

        const title = sessionData.title ?? '연습';
        const titleText = title.length > 10 ? title.substring(0, 10) + '...' : title;
        await this.notificationService.sendPushNotifications({
            to: toIds,
            title: '연습실 이용 안내',
            body: josa(titleText, '이/가') + ' 10분 뒤 종료됩니다.\n강제 종료되기 전에 정리 후 사진을 찍어요.',
        });
    }

    @Process('start-external-reservation')
    async handleExternalReservationSession(job: Job<ReservationSessionJson>) {
        this.eventEmitter.emit('start-external-reservation');
    }


    @Process('discard-reservation-session')
    async discardReservationSession(job: Job<ReservationSessionJson>) {
        const sessionData = job.data;
        if (!sessionData) return;
        if (sessionData.reservationType === 'EXTERNAL') return;

        this.eventEmitter.emit('discard-reservation-session');

        const toIds = sessionData.attendanceList?.map(({ user }) => user?.memberId).filter((id): id is number => id != null) ?? [];
        if (toIds.length === 0) return;

        const title = sessionData.title ?? '연습';
        const titleText = title.length > 10 ? title.substring(0, 10) + '...' : title;
        await this.notificationService.sendPushNotifications({
            to: toIds,
            title: '연습 취소 안내',
            body: josa(titleText, '이/가') + ' 시간 내 미시작 의해 취소 되었습니다.\n다음부터는 시작 시간을 준수해주세요.',
        });
    }
}