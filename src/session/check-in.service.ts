import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma.service';
import { SessionManagerService } from 'src/session/session-manager.service';
import { RoleEnum } from 'src/role/role.enum'
import { BASIC_TIME_INTERVAL } from './constant-variable';
import { timeFormmatForClient } from 'src/reservation/reservation.utils';

@Injectable()
export class CheckInService {

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly prisma: PrismaService,
        private readonly sessionManager: SessionManagerService,
        private readonly roleEnum: RoleEnum
    ) { }

    //세션의 생성/시작/참여 가능 상태를 반환, 현재 세션, 다음 예약 세션
    sessionStatus(userId: number): SessionState {

        //UTC 시간
        const utcTime = new Date()

        //UTC단위 (KST +9) --now
        const koreaTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000);

        // 한국 시간으로 변환 (UTC+9)
        const kstHour = koreaTime.getUTCHours();
        // 한국 날짜
        const date = koreaTime.toISOString().split('T')[0]

        // 10~22시가 아닌 조건

        if (kstHour < 10 || kstHour >= 22) return { status: 'UNAVAILABLE', errorMessage: '연습실 사용시간: 10:00 ~ 22:00' }

        const nextReservationSession = this.sessionManager.getNextReservationSession();

        const startTime = new Date(date + 'T' + nextReservationSession?.startTime + 'Z')

        const currentSession = this.sessionManager.getCurrentSessionStatus()


        //현재 진행 중인 세션이 있는 경우
        if (!!currentSession) {

            //현재 세션이 열린 연습인 경우에는 참여 가능 내용 전송
            if (this.sessionManager.isAlreadyAttendUser(userId))
                return { status: 'UNAVAILABLE', errorMessage: '이미 참여 중인 연습이에요.' }

            if (currentSession.participationAvailable)
                return { status: 'JOINABLE', currentSession: currentSession }

            //현재 세션이 닫힌 연습인 경우에는 참여 불가능 내용 전송
            else
                return { status: 'UNAVAILABLE', errorMessage: '참여할 수 없는 연습이에요.' }
        }

        //현재 진행중인 세션이 없고고
        //다음 예약 세션이 없거나
        //startTime - now(여유시간)이 40분 보다 큰 경우
        //실행 가능하다는 내용 전송
        console.log(startTime.getTime() - koreaTime.getTime())
        if (!nextReservationSession || startTime.getTime() - koreaTime.getTime() > 40 * 60 * 1000) {
            return { status: 'CREATABLE', nextReservationSession: nextReservationSession || null }
        }

        //다음 예약 세션이 존재하는데 여유시간이 15분 이내인 경우
        if (startTime.getTime() - koreaTime.getTime() < 15 * 60 * 1000 && startTime.getTime() - koreaTime.getTime() > -10 * 60 * 1000) {

            const isParticipator = nextReservationSession.participators.some(
                (participator) => participator.memberId === userId
            );
            //예약 세션의 참가자인 경우 시작 가능하다는 내용 전송

            if (isParticipator)
                return { status: 'STARTABLE', nextReservationSession: nextReservationSession }
        }

        //모든 조건문 통과시 모두 불가능 하다는 알럿 노출
        return { status: 'UNAVAILABLE', errorMessage: '참여할 수 없는 세션이에요' }
    }



    private async createRealtimeSession(user: User, participationAvailable: boolean) {

        const utcTime = new Date();
        const endTime = new Date(utcTime.getTime() + BASIC_TIME_INTERVAL);

        const newSessionProps = {
            participationAvailable,
            startTime: timeFormmatForClient(utcTime),
            endTime: timeFormmatForClient(endTime),
            attendanceList: [{ user: user, status: '참가', timeStamp: utcTime }] as { user: User; status: '참가'; timeStamp: Date }[],
            creatorName: user.name,
            creatorId: user.memberId,
            creatorNickname: user.nickname
        }

        await this.sessionManager.startRealTimeSession(newSessionProps)
    }


    //유저가 시작할 수 있으면 세션 시작
    private async startNextReservationSession(user: User) {

        await this.sessionManager.startReservationSession(user)

        this.eventEmitter.emit('start-reservation-session')
        this.eventEmitter.emit('session-update')
    }


    async tryStartSession(memberId: number, participationAvailable: boolean = false) {

        const user = await this.prisma.member.findUnique({
            where: { memberId },
            select: {
                memberId: true,
                email: true,
                name: true,
                nickname: true,
                club: true,
                profileImageUrl: true,
                enrollmentNumber: true,
                roleAssignment: true
            }
        });

        if (!user) throw new UnauthorizedException('권한이 없습니다.')

        const nextReservationSession = this.sessionManager.getNextReservationSession();
        const utcTime = new Date();
        const koreaTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000);

        const today = koreaTime.toISOString().split('T')[0]

        const startTime = new Date(today + 'T' + nextReservationSession?.startTime + '.000Z')
        const userInformation: User = {
            ...user,
            club: user.club.clubName,
            role: user.roleAssignment.map(roleAssignment => this.roleEnum.EnToKo(roleAssignment.role))
        }
        //다음 예약세션이 없거나 다음 예약 세션 시작까지 40분 이상 남았을경우
        if (!nextReservationSession || startTime.getTime() - koreaTime.getTime() >= 40 * 60 * 1000) {
            this.createRealtimeSession(userInformation, participationAvailable)
            return { status: 'created' }
        }


        //다음 예약세션 시작까지 10분 이하로 남았을경우
        if (!!nextReservationSession || startTime.getTime() - koreaTime.getTime() < 10 * 60 * 1000) {
            const isParticipator = nextReservationSession.participators.some(
                (participator) => participator.memberId === user.memberId
            );
            if (isParticipator) {
                this.startNextReservationSession(userInformation)
                return { status: 'started' }
            }
        }

        return { title: 'failed' }
    }



    async attendToSession(memberId: number) {

        const currentSession = this.sessionManager.getCurrentSessionStatus();

        if (!currentSession) throw new NotFoundException('Current session is not exist')

        if (currentSession.participationAvailable || currentSession.participatorIds.some(id => id == memberId)) {
            const userInfo = await this.prisma.member.findUnique({
                where: { memberId },
                include: {
                    club: { select: { clubName: true } },
                    roleAssignment: { select: { role: true } }
                }
            })

            const user = {
                memberId: userInfo.memberId,
                email: userInfo.email,
                name: userInfo.name,
                nickname: userInfo.nickname,
                club: userInfo.club.clubName,
                enrollmentNumber: userInfo.enrollmentNumber,
                role: userInfo.roleAssignment.map(role => this.roleEnum.EnToKo(role.role)),
                profileImageUrl: userInfo.profileImageUrl
            }

            const status = await this.sessionManager.attendToSession(user)
            this.eventEmitter.emit('session-update');

            return { status };

        }
    }

}
