import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { timeFormmatForClient } from 'src/reservation/reservation.utils';
import { RoleEnum } from 'src/role/role.enum';

@Injectable()
export class SessionLogService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly roleEnum:RoleEnum
    ) { }

    async getUserMonthlySessionLogs(memberId: number, year: number, month: number) {

        const startDate = new Date(year, month, 1, 9, 0, 0)
        const endDate = new Date(year, month+1, 0, 9, 0, 0)

        console.log(startDate.toISOString(), endDate.toISOString())

        const userSessions = await this.prisma.attendance.findMany({
            where: {
                memberId,
                session: {
                    date: {
                        gte: startDate, // UTC 기준 시작 날짜
                        lte: endDate,   // UTC 기준 종료 날짜 포함
                    }
                }
            },
            include: {
                session: { include: { creator: true } },
            },
        });

        console.log(userSessions)

        return userSessions.map((attendance) => {
            const { creatorId, date, endTime, startTime, sessionType, participationAvailable, sessionId, forceEnd, reservationType, title, creator } = attendance.session

            return {
                sessionId,
                creatorId,
                creatorName: creator.name,
                creatorNickname: creator.nickname,
                title,
                date: date.toISOString().split('T')[0], // KST 날짜 반환
                startTime: timeFormmatForClient(startTime), // KST 시작 시간 반환
                endTime: timeFormmatForClient(endTime), // KST 종료 시간 반환, 
                sessionType,
                reservationType,
                participationAvailable,
                forceEnd,
            }
        });
    }

    async getClubOfUserMonthlySessionLogs(memberId: number, year: number, month: number) {

        const startDate = new Date(year, month, 1, 9, 0, 0)
        const endDate = new Date(year, month+1, 0, 9, 0, 0)

        const userInfo = await this.prisma.member.findUnique({
            where: { memberId },
            select: { clubId: true }
        })

        if (!userInfo) throw new BadRequestException('동아리에 가입된 유저가 아니에요.')

        const clubSessions = await this.prisma.session.findMany({
            where: {
                creator: { clubId: userInfo.clubId },
                reservationType: 'REGULAR',
                date: {
                    gte: startDate, // UTC 기준 시작 날짜
                    lte: endDate,   // UTC 기준 종료 날짜 포함
                }
            },
            include: { creator: true }
        });

        return clubSessions.map((session) => {
            const { creatorId, date, endTime, startTime, sessionType, participationAvailable, sessionId, forceEnd, reservationType, title, creator } = session

            return {
                sessionId,
                creatorId,
                creatorName: creator.name,
                creatorNickname: creator.nickname,
                title,
                date: date.toISOString().split('T')[0], // KST 날짜 반환
                startTime: timeFormmatForClient(startTime), // KST 시작 시간 반환
                endTime: timeFormmatForClient(endTime), // KST 종료 시간 반환, 
                sessionType,
                reservationType,
                participationAvailable,
                forceEnd,
            }
        });
    }


    async getSessionInfoBySessionId(sessionId: number) {
        const sessionData = await this.prisma.session.findUnique({
            where: {
                sessionId
            }, include: {
                borrowInstruments: {
                    select: {
                        imageUrl: true,
                        name: true,
                        instrumentType: true,
                        club: { select: { clubName: true } },
                    }
                },
                attendanceList: {
                    select: {
                        member: {
                            select: {
                                memberId: true,
                                name: true,
                                nickname: true,
                                blogUrl: true,
                                club: { select: { clubName: true } },
                                enrollmentNumber: true,
                                profileImageUrl: true,
                                instagramUrl: true,
                                roleAssignment: { select: { role: true } },

                            }
                        },
                        status: true
                    }
                },
                creator: true
            }
        });

        if (!sessionData) return null

        const { creatorId, creator, date, endTime, startTime, sessionType, participationAvailable, reservationId, forceEnd, reservationType, title, extendCount, returnImageUrl, attendanceList, borrowInstruments } = sessionData

        return {
            sessionId,
            creatorId,
            creatorName: creator.name,
            creatorNickname: creator.nickname,
            title,
            date: date.toISOString().split('T')[0], // KST 날짜 반환
            startTime: timeFormmatForClient(startTime), // KST 시작 시간 반환
            endTime: timeFormmatForClient(endTime), // KST 종료 시간 반환, 
            sessionType,
            reservationType,
            participationAvailable,
            forceEnd,
            extendCount,
            returnImageUrl,
            reservationId,
            attendanceList: attendanceList.map(({ member: { club, roleAssignment, ...restOfMemeber }, status }) => {
                return {
                    member: {
                        ...restOfMemeber,
                        club: club?.clubName,
                        role: roleAssignment.map(roleAssign => this.roleEnum.EnToKo(roleAssign.role))
                    },
                    status
                }
            }),
            borrowInstruments: borrowInstruments.map(({ club, ...instrument }) => ({
                ...instrument,
                club: club?.clubName
            }))

        }

    }

    async getSessionInfoByReservatinId(reservationId: number) {
        const sessionData = await this.prisma.session.findUnique({
            where: {
                reservationId
            }, include: {
                borrowInstruments: {
                    select: {
                        imageUrl: true,
                        name: true,
                        instrumentType: true,
                        club: { select: { clubName: true } },
                    }
                },
                attendanceList: {
                    select: {
                        member: {
                            select: {
                                memberId: true,
                                name: true,
                                nickname: true,
                                blogUrl: true,
                                club: { select: { clubName: true } },
                                enrollmentNumber: true,
                                profileImageUrl: true,
                                instagramUrl: true,
                                roleAssignment: { select: { role: true } },

                            }
                        },
                        status: true
                    }
                },
                creator: true
            }
        });
        if (!sessionData) return null
        const { creatorId, date, endTime, startTime, sessionType, participationAvailable, sessionId, creator, forceEnd, reservationType, title, extendCount, returnImageUrl, attendanceList, borrowInstruments } = sessionData

        const toKST = (utcDateTime: Date) => {
            const date = new Date(utcDateTime); // UTC 시간 기준 Date 객체 생성
            return new Date(date.getTime() + 9 * 60 * 60 * 1000); // UTC + 9 시간
        };

        return {
            sessionId,
            creatorId,
            creatorName: creator.name,
            creatorNickname: creator.nickname,
            title,
            date: date.toISOString().split('T')[0], // KST 날짜 반환
            startTime: timeFormmatForClient(startTime), // KST 시작 시간 반환
            endTime: timeFormmatForClient(endTime), // KST 종료 시간 반환, 
            sessionType,
            reservationType,
            participationAvailable,
            forceEnd,
            extendCount,
            returnImageUrl,
            reservationId,
            attendanceList: attendanceList.map(({ member: { club, roleAssignment, ...restOfMemeber }, status }) => {
                return {
                    member: {
                        ...restOfMemeber,
                        club: club?.clubName,
                        role: roleAssignment.map(roleAssign => this.roleEnum.EnToKo(roleAssign.role))
                    },
                    status
                }
            }),
            borrowInstruments: borrowInstruments.map(({ club, ...instrument }) => ({
                ...instrument,
                club: club?.clubName
            }))
        }
    }
}
