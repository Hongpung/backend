import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservationNotificationService } from './reservation-notification.service';

import { PrismaService } from 'src/prisma.service';
import { timeFormmatForClient } from './reservation.utils';
import { SessionManagerService } from '../session/session-manager.service';
import { ReservationSessionProps } from '../session/classes/reservation-session.class';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager'
import { RoleEnum } from 'src/role/role.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';


@Injectable()
export class ReservationSchedulerService implements OnModuleInit {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
    private readonly reservationNotification: ReservationNotificationService,
    private readonly sessionManagerService: SessionManagerService,
    private readonly roleEnum: RoleEnum,
    private readonly eventEmitter: EventEmitter2
  ) {
  }

  private preReservations: ReservationDTO[]
  /**당일 자정 예약 일정 세션 삽입 로직
   * 자정 수행
   */
  async onModuleInit() {

    const latestSessionList = await this.cacheManager.get<string>('latest-session-list');

    await this.fetchReservationsFromDatabase();

    if (!latestSessionList) {
      this.sessionManagerService.clearSessions();

      console.log('LatestSessionList is not exist! \nAdd ReservationSessions to sessionlist')

      if (this.preReservations.length > 0)
        await this.addReservationSessionToSessionList();
    }

    await this.reservationNotification.scheduleReservationUpcommingNotification(this.preReservations)
  }

  // 스케줄 기반 실행
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Seoul',
  })
  async handleCron() {
    this.sessionManagerService.clearSessions();
    //세션 로드
    await this.fetchReservationsFromDatabase();

    this.addReservationSessionToSessionList()

    this.reservationNotification.scheduleReservationUpcommingNotification(this.preReservations)


    this.eventEmitter.emit('session-list-changed')
  }


  private async addReservationSessionToSessionList() {

    const reservationSessionPropsList: ReservationSessionProps[] = []

    const utcTime = new Date()
    //UTC단위 (KST +9) --now
    const koreaTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000);

    // 한국 날짜
    const date = koreaTime.toISOString().split('T')[0]

    // 10~22시가 아닌 조건
    this.preReservations.map(reservation => {


      const startTime = new Date(date + 'T' + reservation.startTime + 'Z')
      const endTime = new Date(date + 'T' + reservation.endTime + 'Z')

      if (reservation.reservationType == 'EXTERNAL') {
        const reservationSessionProps:ReservationSessionProps =
        {
          reservationId: reservation.reservationId,
          reservationType: reservation.reservationType,
          date: reservation.date,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          title: reservation.title,
          participationAvailable: false,
          creatorName: reservation.creatorName,
          borrowInstruments: reservation.borrowInstruments,
          status: startTime.getTime() > koreaTime.getTime() ? 'BEFORE' : endTime.getTime() > koreaTime.getTime() ? 'ONAIR' : 'AFTER' as 'ONAIR' | 'BEFORE' | 'AFTER',
          attendanceList: [] as { user: User; status: "결석" | "출석" | "지각"; timeStamp?: Date; }[]
        } 

        reservationSessionPropsList.push(reservationSessionProps)

      }
      else {

        const reservationSessionProps:ReservationSessionProps =
        {
          reservationId: reservation.reservationId,
          reservationType: reservation.reservationType,
          date: reservation.date,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          title: reservation.title,
          participationAvailable: reservation.participationAvailable,
          creatorName: reservation.creatorName,
          participators: reservation.participators,
          participatorIds: reservation.participators.map(member => member.memberId),
          borrowInstruments: reservation.borrowInstruments,
          creatorId: reservation.creatorId,
          creatorNickname: reservation.creatorNickname,
          status: startTime.getTime() > koreaTime.getTime() ? 'BEFORE' : 'DISCARDED' as 'BEFORE' | 'DISCARDED',
          attendanceList: reservation.participators.map(user => ({ user, status: '결석' })) as { user: User; status: "결석" | "출석" | "지각"; timeStamp?: Date; }[]
        }

        reservationSessionPropsList.push(reservationSessionProps)
      }
    })

    await this.sessionManagerService.addReservationSessions(reservationSessionPropsList)

  }

  private async fetchReservationsFromDatabase() {
    const utcTime = new Date();
    const koreaTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000);
    const koreaDate = new Date(koreaTime.toISOString().split('T')[0])

    const reservations = await this.prisma.reservation.findMany({
      where: {
        date: koreaDate
      },
      include: {
        creator: {
          select: {
            memberId: true,
            name: true,
            nickname: true,
            club: { select: { clubName: true } },
            email: true,
            enrollmentNumber: true,
            roleAssignment: { select: { role: true } },
            profileImageUrl: true,
            instagramUrl: true,
            blogUrl: true,
          }
        },
        participators: {
          select: {
            memberId: true,
            name: true,
            nickname: true,
            club: { select: { clubName: true } },
            email: true,
            enrollmentNumber: true,
            roleAssignment: { select: { role: true } },
            profileImageUrl: true,
            instagramUrl: true,
            blogUrl: true,
          }
        },
        borrowInstruments: { include: { club: { select: { clubName: true } } } }
      }
    })

    const preReservaitons = [];

    reservations.map(({ creator, reservationType, externalCreatorName, ...reservation }) => {
      if (reservationType == 'EXTERNAL') {
        const reservationDetail =
          {
            ...reservation,
            reservationType,
            date: reservation.date.toISOString().split('T')[0],
            startTime: timeFormmatForClient(reservation.startTime),
            endTime: timeFormmatForClient(reservation.endTime),
            reservationId: reservation.reservationId,
            creatorName: externalCreatorName,
            participators: reservation.participators.map(({ club, ...participator }) => (
              {
                ...participator,
                club: club.clubName,
                role: participator.roleAssignment.map(role => this.roleEnum.EnToKo(role.role))
              })),
            borrowInstruments: reservation.borrowInstruments.map(instrumet => ({
              instrumentId: instrumet.instrumentId,
              imageUrl: instrumet.imageUrl,  // url
              name: instrumet.name,
              instrumentType: instrumet.instrumentType,
              club: instrumet.club.clubName,
              borrowAvailable: instrumet.borrowAvailable
            })),
          } as ReservationDTO

        preReservaitons.push(reservationDetail)

      }
      else {
        const reservationDetail =
          {
            ...reservation,
            reservationType,
            date: reservation.date.toISOString().split('T')[0],
            startTime: timeFormmatForClient(reservation.startTime),
            endTime: timeFormmatForClient(reservation.endTime),
            reservationId: reservation.reservationId,
            creatorName: creator.name,          // 생성자 이름
            creatorNickname: creator.nickname,
            email: creator.email,                    // 생성자 이메일
            participators: reservation.participators.map(({ club, ...participator }) => (
              {
                ...participator,
                club: club.clubName,
                role: participator.roleAssignment.map(role => this.roleEnum.EnToKo(role.role))
              })),
            borrowInstruments: reservation.borrowInstruments.map(instrumet => ({
              instrumentId: instrumet.instrumentId,
              imageUrl: instrumet.imageUrl,  // url
              name: instrumet.name,
              instrumentType: instrumet.instrumentType,
              club: instrumet.club.clubName,
              borrowAvailable: instrumet.borrowAvailable
            })),
          } as ReservationDTO


        preReservaitons.push(reservationDetail)
      }
    })

    this.preReservations = preReservaitons;
  }



  /** 
   * 당일 오전 예약 일정 안내 로직
   * 9시 발송
   * 내용:오늘 예약이 존재한다는 문구 노출
   */
  @Cron('0 0 9 * * *', {
    timeZone: 'Asia/Seoul',
  })
  private async sendMorningRemindNotification() {
    await this.reservationNotification.morningScheduleReservationNotification(this.preReservations)
  }


  /**익일 예약 변경 시간 제한 안내
   * 21시 발송
   * 내용:22시까지만 변경이 가능하다는 문구 노출출
   */
  @Cron('0 0 21 * * *', {
    timeZone: 'Asia/Seoul',
  })
  private async sendNextDayReservationsRemindNotification() {
    const nextDateReservation = await this.fetchNextDateReservationsFromDB();
    await this.reservationNotification.nextDayReservationNotification(nextDateReservation)
  }

  /**
   * 익일 예약 목록 로드 => 알림 전송용용
   */
  private async fetchNextDateReservationsFromDB() {

    const utcTime = new Date();
    const koreaTime = new Date(utcTime.getTime() + 9 * 60 * 60 * 1000);
    koreaTime.setDate(koreaTime.getDate() + 1);


    const koreaDate = new Date(koreaTime.toISOString().split('T')[0])

    const reservationDetails = await this.prisma.reservation.findMany({
      where: {
        date: koreaDate
      },
      include: {
        creator: { include: { club: true } },
        participators: { include: { club: true, roleAssignment: true } },
        borrowInstruments: { include: { club: true } }
      }
    })

    console.log(reservationDetails, koreaTime)

    return reservationDetails.map(reservation => ({
      ...reservation,
      date: reservation.date.toISOString().split('T')[0],
      startTime: timeFormmatForClient(reservation.startTime),
      endTime: timeFormmatForClient(reservation.endTime),
      reservationId: reservation.reservationId,
      creatorName: reservation.creator.name,          // 생성자 이름
      creatorNickname: reservation.creator.nickname,
      email: reservation.creator.email,                    // 생성자 이메일
      participators: reservation.participators.map(participator => (
        {
          ...participator,
          club: participator.club.clubName,
          role: participator.roleAssignment.map(role => role.role)
        })),
      borrowInstruments: reservation.borrowInstruments.map(instrumet => ({
        instrumentId: instrumet.instrumentId,
        imageUrl: instrumet.imageUrl,  // url
        name: instrumet.name,
        instrumentType: instrumet.instrumentType,
        club: instrumet.club.clubName,
        borrowAvailable: instrumet.borrowAvailable
      })),
    }));
  }
}