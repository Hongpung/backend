import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { timeFormmatForClient } from 'src/reservation/reservation.utils';
import { RoleEnum } from 'src/role/role.enum';

@Injectable()
export class AdminSessionLogService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly roleEnum: RoleEnum
    ) { }

    async getLatestSessionLogs(skip: number = 0) {

        const latestSessions = await this.prisma.session.findMany({
            include: {
                creator: { select: { name: true, nickname: true } },
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
                }
            },
            orderBy:{sessionId:'desc'},
            skip: 10 * skip,
            take: 10
        });

        return latestSessions.map((session) => {
            const { sessionId, creatorId, creator, date, endTime, startTime, sessionType, participationAvailable, reservationId, forceEnd, reservationType, title, extendCount, returnImageUrl, attendanceList, borrowInstruments } = session

            return {
                sessionId,
                creatorId,
                creatorName: creator.name,
                creatorNickname: creator.nickname,
                sessionType,
                reservationType,
                title,
                date: date.toISOString().split('T')[0], // KST 날짜 반환
                startTime: timeFormmatForClient(startTime), // KST 시작 시간 반환
                endTime: timeFormmatForClient(endTime), // KST 종료 시간 반환, 
                extendCount,
                participationAvailable,
                forceEnd,
                returnImageUrl,
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
        });
    }

}
