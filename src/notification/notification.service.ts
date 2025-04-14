import { Injectable } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { MemberService } from 'src/member/member.service';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class NotificationService {
    private expo: Expo;

    constructor(
        private readonly memberService: MemberService,
        private readonly prisma: PrismaService,
    ) {
        this.expo = new Expo();
    }


    async sendPushNotifications({
        to,
        title,
        body,
        data }: {
            to: number[],
            title: string,
            body: string,
            data?: Record<string, any>, // 추가 데이터
        }
    ): Promise<void> {
        const messages: ExpoPushMessage[] = [];
        // Expo Push Token 확인 및 메시지 구성
        for (const memberId of to) {

            const notificationToken = await this.memberService.findOneNotificationToken(memberId)

            if (notificationToken) {
                console.log('Notification Token:', notificationToken);
                console.log('Notification Data:', {
                    memberId: +memberId,
                    data: { title, body, data }
                });

                // 알림 생성 시도
                const notification = await this.prisma.notification.create({
                    data: {
                        memberId,
                        data: JSON.stringify({ title, body, data })
                    }
                });

                console.log(`Notification created with ID: ${notification.notificationId}`);
            }

            if (!notificationToken?.pushEnable)
                continue;


            if (!Expo.isExpoPushToken(notificationToken.notificationToken)) {
                console.error(`Push token ${notificationToken.notificationToken} is not a valid Expo push token`);
                continue;
            }

            messages.push({
                to: notificationToken.notificationToken,
                sound: 'default',
                title,
                body,
                data
            });
        }

        // 메시지 전송
        const chunks = this.expo.chunkPushNotifications(messages);
        const tickets: ExpoPushTicket[] = [];

        try {
            for (const chunk of chunks) {
                const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            }
            console.log('Push notification tickets:', tickets);
        } catch (error) {
            console.error('Error sending push notifications:', error);
        }
    }

    async sendAllPushNotifications({
        title,
        body,
        data }: {
            title: string,
            body: string,
            data?: Record<string, any>, // 추가 데이터
        }
    ): Promise<void> {
        const messages: ExpoPushMessage[] = [];
        const memberTokens = await this.memberService.findAllNotificationTokens()
        // Expo Push Token 확인 및 메시지 구성
        for (const memberToken of memberTokens) {


            if (memberToken) {
                // 알림 생성 시도
                const notification = await this.prisma.notification.create({
                    data: {
                        memberId: memberToken.memberId,
                        data: JSON.stringify({ title, body, data })
                    }
                });

                console.log(`Notification created with ID: ${notification.notificationId}`);
            }

            if (!memberToken?.pushEnable)
                continue;


            if (!Expo.isExpoPushToken(memberToken.notificationToken)) {
                console.error(`Push token ${memberToken.notificationToken} is not a valid Expo push token`);
                continue;
            }

            messages.push({
                to: memberToken.notificationToken,
                sound: 'default',
                title,
                body,
                data
            });
        }

        // 메시지 전송
        const chunks = this.expo.chunkPushNotifications(messages);
        const tickets: ExpoPushTicket[] = [];

        try {
            for (const chunk of chunks) {
                const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            }
            console.log('Push notification tickets:', tickets);
        } catch (error) {
            console.error('Error sending push notifications:', error);
        }
    }


    async getUserNotifications(memberId: number) {
        const notifications = await this.prisma.notification.findMany({
            where: { memberId },
            orderBy: {
                timestamp: 'desc',
            },
        })

        return notifications.map(({ data, ...notifications }) => ({
            ...notifications,
            data: JSON.parse(data as string)
        }))
    }

    async userReadNotifications(memberId: number) {
        const updatedNotifications = await this.prisma.notification.updateMany({
            where: {
                memberId, // 특정 사용자 알림만 처리
                isRead: false, // 읽지 않은 알림만 처리
            },
            data: {
                isRead: true,
            },
        });
        return { message: 'Read all success' }
    }

    async deleteNotification(notificationId: number, memberId: number) {
        const updatedNotifications = await this.prisma.notification.delete({
            where: {
                notificationId, // 특정 사용자 알림만 처리
                memberId
            }
        });
        return { message: 'Delete success' }
    }

    async deleteAllNotifications(memberId: number) {
        await this.prisma.notification.deleteMany({
            where: {
                memberId, // 특정 사용자 알림만 처리
            }
        });

        return { message: 'Delete All success' }
    }
    async getNotreadStatus(memberId: number) {
        const notReadNotifcation = await this.prisma.notification.findFirst({
            where: {
                memberId,
                isRead: false
            }, select: { notificationId: true }
        });

        return { status: !!notReadNotifcation }
    }

}
