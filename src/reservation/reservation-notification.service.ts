import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { josa } from 'es-hangul';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class ReservationNotificationService {
    constructor(
        @InjectQueue('reservation') private readonly reservationQueue: Queue,
        private readonly notificationService: NotificationService
    ) { }

    async morningScheduleReservationNotification(reservations: ReservationDTO[]) {
        const notificationTasks = reservations.map(async (reservation) => {
            this.notificationService.sendPushNotifications({
                to: reservation.participators.map(user => { console.log(user.memberId); return (user.memberId) }),
                title: '오늘의 연습실 예약',
                body: josa(reservation.title.length > 10 ? reservation.title.substring(0, 10) + '...' : reservation.title, '이/가') + ' ' + reservation.startTime.slice(0, -3) + '에 시작됩니다.\n늦지 않고 시간안에 도착해야해요.'
            })
        });

        const results = await Promise.allSettled(notificationTasks);

        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Failed to schedule notification for reservation: ${reservations[index].reservationId}`, result.reason);
            }
        });
    }


    async scheduleReservationUpcommingNotification(reservations: ReservationDTO[]) {
        if (reservations.length == 0) return
        const notificationTasks = reservations.map(async (reservation) => {
            const utcTime = new Date();
            const nowTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000);
            const startTime = new Date(`${reservation.date}T${reservation.startTime}Z`);
            if (reservation.reservationType !== 'EXTERNAL') {
                const delay = (startTime.getTime() - nowTime.getTime()) - 15 * 60 * 1000; // 15분 전 알림

                if (delay > 0) {
                    await this.reservationQueue.add(`sendUpcomingNotification`, reservation, {
                        delay,
                        attempts: 3, // 최대 3회 재시도
                        backoff: 5000, // 재시도 간격 (5초)
                        removeOnFail: true, // 재시도 실패 후 자동 삭제
                        removeOnComplete: true,
                        jobId: reservation.reservationId
                    });
                    console.log(`Notification scheduled for reservation ${reservation.reservationId}`);
                } else {
                    console.log(`Reservation ${reservation.reservationId} is already past start time.`);
                }
            }
        });

        const results = await Promise.allSettled(notificationTasks);

        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Failed to schedule notification for reservation: ${reservations[index].reservationId}`, result.reason);
            }
        });
    }


    async nextDayReservationNotification(reservations: ReservationDTO[]) {
        const notificationTasks = reservations.map(async (reservation) => {
            const creatorId = reservation.participators[0].memberId
            this.notificationService.sendPushNotifications({
                to: [creatorId],
                title: '예약 변경 가능시간 안내',
                body: '22시 이후엔 변경이 불가능 해요.\n변경할 항목이 있다면 지금 빨리 해요.'
            })
        });

        const results = await Promise.allSettled(notificationTasks);

        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`Failed to schedule notification for reservation: ${reservations[index].reservationId}`, result.reason);
            }
        });
    }

    async forceDeleteNotification({ participators, title }: { participators: { memberId: number }[], title: string }) {

        await this.notificationService.sendPushNotifications({
            to: [...participators.map(member => member.memberId)],
            title: '예약 취소 안내',
            body: `관리자에 의해 ${josa(title.length > 10 ? title.substring(0, 10) + '...' : title, '이/가')} 취소되었어요.\n질문 사항이 있다면 의장에게 문의해요.`
        })

        return { message: 'Success to send Messages' }
    }

    async forceChangeNotification({ participators, title, reservationId }: { participators: { memberId: number }[], title: string, reservationId: number }) {

        await this.notificationService.sendPushNotifications({
            to: [...participators.map(member => member.memberId)],
            title: '예약 취소 안내',
            body: `관리자에 의해 ${josa(title.length > 10 ? title.substring(0, 10) + '...' : title, '이/가')} 변경되었어요.\n변경 사항을 확인해주세요.\n질문 사항이 있다면 의장에게 문의해요.`,
            data: { reservationId }
        })

        return { message: 'Success to send Messages' }
    }

    async forceAllocatedNotification(creator: number, reservationId: number) {

        await this.notificationService.sendPushNotifications({
            to: [creator],
            title: '예약 생성 안내',
            body: '관리자에 의해 생성된 연습에 할당되었어요.\n예약 내용을 확인해주세요.\n질문 사항이 있다면 의장에게 문의해요.',
            data: { reservationId }
        })

        return { message: 'Success to send Messages' }
    }

    async deletedNotification({ participators, title }: { participators: { memberId: number }[], title: string }) {

        await this.notificationService.sendPushNotifications({
            to: [...participators.map(member => member.memberId)],
            title: '예약 취소 안내',
            body: `${josa(title.length > 10 ? title.substring(0, 10) + '...' : title, '이/가')} 취소되었어요.`
        })

        return { message: 'Success to send Messages' }
    }

    async kickedNotification({ participatorIds, title, reservationId }: { participatorIds: number[], title: string, reservationId: number }) {

        await this.notificationService.sendPushNotifications({
            to: [...participatorIds],
            title: '예약 제외 안내',
            body: `${title}에서 제외되었어요.\n변경 사항을 확인해주세요.`,
            data: { reservationId }
        })

        return { message: 'Success to send Messages' }
    }

    async changedNotification({ participators, title, reservationId }: { participators: { memberId: number }[], title: string, reservationId: number }) {

        await this.notificationService.sendPushNotifications({
            to: [...participators.map(member => member.memberId)],
            title: '예약 변경 안내',
            body: `${josa(title.length > 10 ? title.substring(0, 10) + '...' : title, '이/가')} 변경되었어요.\n변경 사항을 확인해주세요.`,
            data: { reservationId }
        })

        return { message: 'Success to send Messages' }
    }

    async createdNotification(creator: number, reservationId: number) {

        await this.notificationService.sendPushNotifications({
            to: [creator],
            title: '예약 생성 안내',
            body: '관리자에 의해 생성된 연습에 할당됐어요.\n예약 내용을 확인해주세요.\n질문 사항이 있다면 의장에게 문의해요.',
            data: { reservationId }
        })

        return { message: 'Success to send Messages' }
    }


    async invitedNotification(participatorIds: number[], reservationTitle: string, reservationId: number) {

        await this.notificationService.sendPushNotifications({
            to: [...participatorIds],
            title: '예약 초대 안내',
            body: `${reservationTitle}에 초대됐어요.\n예약 내용을 확인해주세요.`,
            data: { reservationId }
        })

        return { message: 'Success to send Messages' }
    }

    async participatorExitedNotification(creatorId: number, memberName: string, reservationTitle: string, reservationId: number) {

        await this.notificationService.sendPushNotifications({
            to: [creatorId],
            title: '인원 변경 안내',
            body: `${memberName}님이 ${reservationTitle}에서 나갔어요.\n예약 내용을 확인해주세요.`,
            data: { reservationId }
        })

        return { message: 'Success to send Messages' }
    }
}