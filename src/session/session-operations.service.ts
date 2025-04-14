import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma.service';
import { Server, Socket } from 'socket.io';
import { SessionManagerService } from 'src/session/session-manager.service';
import { Injectable } from '@nestjs/common';
import { dateFormmatForDB, timeFormmatForDB } from 'src/reservation/reservation.utils';

@Injectable()
export class SessionOperationsService {

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly prisma: PrismaService,
        private readonly sessionManager: SessionManagerService,
    ) { }

    private isReservationSessionJson(
        session: RealtimeSessionJson | ReservationSessionJson
    ): session is ReservationSessionJson {
        return session.sessionType === 'RESERVED';
    }

    isCheckinUser(userId: number): { isCheckin: boolean } {
        const isCheckin = this.sessionManager.isAlreadyAttendUser(userId)
        return { isCheckin }
    }

    isValidUser(userId: number): boolean {

        const currentSession = this.sessionManager.getCurrentSessionStatus();

        console.log(currentSession)

        if (!currentSession) return false;

        if (this.sessionManager.isAlreadyAttendUser(userId)) return true;

        if (currentSession.sessionType == 'RESERVED')
            return currentSession.participatorIds.some(id => id == userId) || currentSession.participationAvailable;

        else
            return currentSession.creatorId == userId || currentSession.participationAvailable
    }

    async extendSession(userId: number) {
        if (this.sessionManager.isAlreadyAttendUser(userId)) {
            const currentSession = this.sessionManager.getCurrentSessionStatus();
            const endTime = timeFormmatForDB(currentSession.endTime);
            const now = new Date()
            const parsedTime = new Date(1970, 0, 1, now.getHours(), now.getMinutes(), now.getSeconds())
            console.log(endTime, parsedTime)

            if (endTime > parsedTime && endTime.getTime() - parsedTime.getTime() >= 10 * 60 * 1000)
                await this.sessionManager.extendSession();

            else
                return { message: 'Fail' }

            return { message: 'Success' }
        } return { message: 'Fail' }
    }


    async endSession(userId: number, returnImageUrls: string[]) {
        //유효한 접속자인지 확인
        if (this.sessionManager.isAlreadyAttendUser(userId)) {

            const currentSession = this.sessionManager.getCurrentSessionStatus();

            if (!currentSession) return { message: 'Fail' }

            const utcTime = new Date();

            const timegap = utcTime.getTime() - new Date(currentSession.date + 'T' + currentSession.startTime + '+09:00').getTime();
            console.log('timegap:'+timegap)
            //
            if (timegap < 15 * 60 * 1000) return { message: 'Fail' }
            
            this.eventEmitter.emit('end-session', currentSession.sessionId)
            
            const endSession = await this.sessionManager.endSession();
            
            const koreanTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000);
            const nowTime = koreanTime.toUTCString().split(' ')[4];


            if (this.isReservationSessionJson(endSession)) {
                const sessionData = {
                    date: dateFormmatForDB(endSession.date),
                    startTime: timeFormmatForDB(endSession.startTime),
                    endTime: timeFormmatForDB(nowTime),
                    creatorId: endSession.creatorId,
                    title: endSession.title,
                    sessionType: endSession.sessionType,
                    reservationType: endSession.reservationType,
                    reservationId: endSession.reservationId,
                    extendCount: endSession.extendCount,
                    participationAvailable: endSession.participationAvailable,
                    returnImageUrl: returnImageUrls,
                    forceEnd: false,
                };

                // Attendance 데이터
                const attendanceData = endSession.attendanceList.map(({ user, status, timeStamp }) => ({
                    memberId: user.memberId,
                    status: status,
                    timeStamp
                }));

                await this.prisma.session.create({
                    data: {
                        ...sessionData,
                        attendanceList: {
                            create: attendanceData,
                        },
                    },
                    include: {
                        attendanceList: true,
                    },
                });
            } else {
                const sessionData = {
                    date: dateFormmatForDB(endSession.date),
                    startTime: timeFormmatForDB(endSession.startTime),
                    endTime: timeFormmatForDB(nowTime),
                    creatorId: endSession.creatorId,
                    title: endSession.title,
                    sessionType: endSession.sessionType,
                    extendCount: endSession.extendCount,
                    participationAvailable: endSession.participationAvailable,
                    returnImageUrl: returnImageUrls,
                    forceEnd: false,
                };

                // Attendance 데이터
                const attendanceData = endSession.attendanceList.map(({ user, status, timeStamp }) => ({
                    memberId: user.memberId,
                    status: status,
                    timeStamp
                }));

                await this.prisma.session.create({
                    data: {
                        ...sessionData,
                        attendanceList: {
                            create: attendanceData,
                        },
                    },
                    include: {
                        attendanceList: true,
                    },
                });
            }

            // this.currentSession = null;
            return { message: 'Success' }
        }
        return { message: 'Fail' }
    }

    @OnEvent('force-end-session')
    private async forceEndSession() {
        //세션 강제 종료
        const currentSession = this.sessionManager.getCurrentSessionStatus();

        console.log('called Force End at Session-Operation')
        if (!currentSession) return { message: 'Fail' }

        await this.sessionManager.forceEndSession();

        if (!currentSession) return;

        if (currentSession.sessionType == 'RESERVED') {
            if (currentSession.reservationType != 'EXTERNAL') {
                const sessionData = {
                    date: new Date(currentSession.date + 'T00:00:00.000Z'),
                    startTime: timeFormmatForDB(currentSession.startTime),
                    endTime: timeFormmatForDB(currentSession.endTime),
                    creatorId: currentSession.creatorId,
                    title: currentSession.title,
                    sessionType: currentSession.sessionType,
                    reservationType: currentSession.reservationType,
                    reservationId: currentSession.reservationId,
                    extendCount: currentSession.extendCount,
                    participationAvailable: currentSession.participationAvailable,
                    returnImageUrl: null,
                    forceEnd: true
                };

                // Attendance 데이터
                const attendanceData = currentSession.attendanceList.map(({ user, status, timeStamp }) => ({
                    memberId: user.memberId,
                    status: status,
                    timeStamp
                }));

                await this.prisma.session.create({
                    data: {
                        ...sessionData,
                        attendanceList: {
                            create: attendanceData
                        },
                    },
                    include: {
                        attendanceList: true,
                    },
                });
            }
        } else {
            const sessionData = {
                date: new Date(currentSession.date + 'T00:00:00.000Z'),
                startTime: timeFormmatForDB(currentSession.startTime),
                endTime: timeFormmatForDB(currentSession.endTime),
                creatorId: currentSession.creatorId,
                title: currentSession.title,
                sessionType: currentSession.sessionType,
                extendCount: currentSession.extendCount,
                participationAvailable: currentSession.participationAvailable,
                returnImageUrl: null,
                forceEnd: true
            };

            // Attendance 데이터
            const attendanceData = currentSession.attendanceList.map(({ user, status, timeStamp }) => ({
                memberId: user.memberId,
                status: status,
                timeStamp
            }));

            await this.prisma.session.create({
                data: {
                    ...sessionData,
                    attendanceList: {
                        create: attendanceData,
                    },
                },
                include: {
                    attendanceList: true,
                },
            });
        }
    }


    emitOnChange(server: Server) {
        const currentSession = this.sessionManager.getCurrentSessionStatus();
        console.log(currentSession)
        server.emit('fetchSessionUpdate', JSON.stringify(currentSession))
    }

    fetchCurrentSession(client: Socket) {
        //client가 현재 세션 요청하면 전달
        const currentSession = this.sessionManager.getCurrentSessionStatus();
        client.emit('currentSession', JSON.stringify(currentSession));
    }
}