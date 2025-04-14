import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from 'src/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Prisma } from '@prisma/client';
import { dateFormmatForDB, timeFormmatForClient, timeFormmatForDB } from './reservation.utils';
import { someConflictReservation } from './reservation.query-raw';
import { ReservationNotificationService } from './reservation-notification.service';
import { InstrumentEnum } from 'src/instrument/instrument.enum';
import { RoleEnum } from 'src/role/role.enum';

@Injectable()
export class ReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly instrumentEnum: InstrumentEnum,
    private readonly roleEnum:RoleEnum,
    private readonly reservationNotification: ReservationNotificationService
  ) {
  }

  async getTodayReservations(memberId: number) {
    const utcDate = new Date();
    const koreanDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
    const formmatedKoreanToday = new Date(koreanDate.toISOString().split('T')[0] + 'T00:00Z');

    const reservations = await this.prisma.reservation.findMany({
      where: {
        participators: { some: { memberId } },
        date: formmatedKoreanToday
      }, include: {
        participators: { select: { memberId: true } },
        creator: { select: { name: true, nickname: true } }
      }
    });

    return reservations.map(({ creator, participators, ...reservation }) => ({
      ...reservation,
      date: reservation.date.toISOString().split('T')[0],
      startTime: timeFormmatForClient(reservation.startTime),
      endTime: timeFormmatForClient(reservation.endTime),
      amountOfParticipators: participators.length,
      creatorName: creator.name,
      creatorNickname: creator.nickname
    }))
  }

  /**
   * 유저 서비스 - 본인 예약 조회
   * @return 간소화 예약 정보
   * */
  async getUserNextReservations(memberId: number, skip: number = 0) {
    const utcDate = new Date();
    const koreanDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
    const formmatedStartDate = new Date(koreanDate.toISOString().split('T')[0] + 'T00:00Z');

    const reservations = await this.prisma.reservation.findMany({
      where: {
        participators: { some: { memberId } },
        date: {
          gte: formmatedStartDate,
        }
      },
      include: {
        participators: { select: { memberId: true } },
        creator: { select: { name: true, nickname: true } }
      },
      skip: skip * 10,
      take: 10
    });

    return reservations.map(({ creator, participators, ...reservation }) => ({
      ...reservation,
      date: reservation.date.toISOString().split('T')[0],
      startTime: timeFormmatForClient(reservation.startTime),
      endTime: timeFormmatForClient(reservation.endTime),
      amountOfParticipators: participators.length,
      creatorName: creator.name,
      creatorNickname: creator.nickname
    }))
  }


  /**
   * 공용 서비스 - 기간 예약 조회
   * @return 일자, 유형, 참여 가능 여부
   * */
  async getReservationsOfTerm({ startDateString, endDateString }: { startDateString: string, endDateString: string }) {
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    const reservations = await this.prisma.reservation.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        reservationId: true,
        date: true,
        startTime: true,
        endTime: true,
        creator: { select: { nickname: true, name: true } },
        externalCreatorName: true,
        title: true,
        reservationType: true,
        participationAvailable: true,
        _count: { select: { participators: true } }
      }
    });

    const formattedReservations = reservations.map(({ _count, creator, externalCreatorName, ...res }) => ({
      ...res,
      amountOfParticipators: _count.participators,
      reservationId: res.reservationId,
      creatorName: res.reservationType == 'EXTERNAL' ? externalCreatorName : creator.name,
      creatorNickname: res.reservationType == 'EXTERNAL' ? null : creator.name,
      date: res.date.toISOString().split('T')[0],      // 날짜만 반환
      startTime: timeFormmatForClient(res.startTime),
      endTime: timeFormmatForClient(res.endTime),
    }));

    return formattedReservations;
  }

  /**
   * 공용 서비스 - 월간 예약 조회
   * @return 일자, 유형, 참여 가능 여부부
   * */
  async getReservationsByMonth({ year, month }: { year: number, month: number }) {
    const startDate = new Date(`${year}-${month}-01`);
    const endDate = new Date(`${year}-${month}-01`);
    endDate.setMonth(endDate.getMonth() + 1)
    const reservations = await this.prisma.reservation.findMany({
      where: {
        date: {
          gte: startDate,  // 월의 첫날 이후
          lt: endDate,     // 다음 달의 첫날 이전
        },
      },
      select: {
        reservationId: true,
        date: true,
        reservationType: true,
        participationAvailable: true,
      }
    });

    const formattedReservations = reservations.map(({ ...res }) => ({
      ...res,
      date: res.date.toISOString().split('T')[0],
    }));

    return formattedReservations;
  }

  /**
   * 공용 서비스 - 일간 예약 조회
   * @return 일자, 유형, 참여 가능 여부부
   * */
  async getReservationsByDate({ date }: { date: string }) {
    const selectedDate = new Date(`${date}`);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        date: selectedDate
      },
      select: {
        reservationId: true,
        date: true,
        startTime: true,
        endTime: true,
        creator: { select: { nickname: true, name: true } },
        externalCreatorName: true,
        title: true,
        reservationType: true,
        participationAvailable: true,
        _count: { select: { participators: true } }
      }
    });

    const formattedReservations = reservations.map(({ _count, creator, externalCreatorName, ...res }) => ({
      ...res,
      amountOfParticipators: _count.participators,
      reservationId: res.reservationId,
      creatorName: res.reservationType == 'EXTERNAL' ? externalCreatorName : creator.name,
      creatorNickname: res.reservationType == 'EXTERNAL' ? null : creator.nickname,
      date: res.date.toISOString().split('T')[0],      // 날짜만 반환
      startTime: timeFormmatForClient(res.startTime),
      endTime: timeFormmatForClient(res.endTime),
    }));

    return formattedReservations;
  }

  /**
   * 공용 서비스 - 일간 예약 불가 시간 조회
   * @return 시간
   * */
  async getOccupiedTimesOnDate({ date }: { date: string }) {
    const selectedDate = new Date(`${date}`);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        date: selectedDate
      },
      select: {
        creator: { select: { name: true } },
        externalCreatorName: true,
        title: true,
        reservationType: true,
        reservationId: true,
        startTime: true,
        endTime: true,
      }
    });

    const occupiedTimesOnDate = reservations.map(({ creator, externalCreatorName, ...res }) => ({
      ...res,
      creatorName: res.reservationType == 'EXTERNAL' ? externalCreatorName : creator.name,
      startTime: timeFormmatForClient(res.startTime),
      endTime: timeFormmatForClient(res.endTime),
    }));

    return occupiedTimesOnDate;
  }

  //공용 서비스
  async getReservationDetail(reservationId: number) {

    const reservation = await this.prisma.reservation.findUnique({
      where: {
        reservationId
      },
      select: {
        reservationId: true,
        date: true,
        startTime: true,
        endTime: true,
        creator: true,
        externalCreatorName: true,
        title: true,
        reservationType: true,
        participationAvailable: true,
        participators: { include: { club: { select: { clubName: true } }, roleAssignment: true } },
        borrowInstruments: { include: { club: { select: { clubName: true } } } }
      }
    });

    const {
      title,
      reservationType,
      participationAvailable,
      externalCreatorName,
      creator } = reservation

    if (reservationType == 'EXTERNAL') {
      const formattedReservation = {
        reservationId: reservation.reservationId,
        title,
        reservationType,
        participationAvailable,
        creatorName: externalCreatorName,
        date: reservation.date.toISOString().split('T')[0],      // 날짜만 반환
        startTime: timeFormmatForClient(reservation.startTime),
        endTime: timeFormmatForClient(reservation.endTime)
      };

      return formattedReservation;
    } else {
      const formattedReservation = {
        reservationId: reservation.reservationId,
        title,
        reservationType,
        participationAvailable,
        creatorId: creator.memberId,
        creatorName: creator.name,
        creatorNickname: creator.nickname,
        date: reservation.date.toISOString().split('T')[0],      // 날짜만 반환
        startTime: timeFormmatForClient(reservation.startTime),
        endTime: timeFormmatForClient(reservation.endTime),
        participators: reservation.participators.map(userStatus => ({
          memberId: userStatus.memberId,
          profileImageUrl: userStatus.profileImageUrl,
          name: userStatus.name,
          nickname: userStatus.nickname,
          club: userStatus.club?.clubName,
          blogUrl:userStatus.blogUrl,
          instagramUrl:userStatus.instagramUrl,
          enrollmentNumber: userStatus.enrollmentNumber,
          role: userStatus.roleAssignment.map(role => this.roleEnum.EnToKo(role.role))
        })),
        borrowInstruments: reservation.borrowInstruments.map(({ clubId, club, borrowAvailable, ...instrument }) => ({
          ...instrument,
          instrumentType: this.instrumentEnum.EnToKo(instrument.instrumentType),
          club: club.clubName
        }))
      };


      return formattedReservation;
    }
  }


  /**
   * 유저 서비스 - 예약 추가
   */
  async createReservation({ createReservationDto, memberId }: { createReservationDto: CreateReservationDto, memberId: number }) {

    const { date, startTime, endTime } = createReservationDto;


    const nowTime = new Date(); // 현재 서버 시간 (KST)

    const reservedDate = new Date(date); // 예약하려는 날짜

    // 예약 가능 마감 기한 (한국 시간 기준, 예약 날짜의 전날 22:00)
    const deadline = new Date(reservedDate);
    deadline.setDate(reservedDate.getDate() - 1);
    deadline.setHours(22 - 9, 0, 0, 0);

    if (nowTime.getTime() > deadline.getTime()) {
      throw new ForbiddenException('예약은 전날 22:00까지 가능합니다.');
    }

    const start = timeFormmatForDB(startTime)
    const end = timeFormmatForDB(endTime)
    // 예약 시간 중복 확인
    return this.prisma.$transaction(async (prisma) => {

      const hasOverlapReservation = await someConflictReservation(prisma, { date, endTime, startTime })

      if (hasOverlapReservation)
        throw new ConflictException('이미 해당 시간에 예약이 존재합니다.');

      const { participationAvailable, title, reservationType } = createReservationDto

      const createdReservation = await prisma.reservation.create({
        data: {
          date: reservedDate,
          startTime: start,
          endTime: end,

          creatorId: memberId,
          externalCreatorName: null,

          title,
          reservationType,
          participationAvailable,

          participators: {
            connect: [...createReservationDto.participatorIds, memberId].map((memberId) => ({
              memberId, // Prisma 스키마 기준
            })),
          },
          borrowInstruments: {
            connect: createReservationDto.borrowInstrumentIds.map((instrumentId) => ({
              instrumentId, // Prisma 스키마 기준
            })),
          },
        },
        include: {
          creator: true,
          participators: true,
          borrowInstruments: true,
        },
      })

      this.reservationNotification.invitedNotification(createReservationDto.participatorIds, createReservationDto.title, createdReservation.reservationId)

      return { message: 'Success' };
    }).catch((error: unknown) => {

      if (error instanceof HttpException)
        throw error;
      // PrismaClientKnownRequestError 처리

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('중복된 예약 정보가 존재합니다.');
        }
      }

      // PrismaClientValidationError 처리
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException('잘못된 요청 데이터입니다.');
      }

      // 그 외의 예상치 못한 에러 처리
      console.error('Unhandled error:', error);
      throw new InternalServerErrorException('예약 업데이트 중 알 수 없는 에러가 발생했습니다.');
    })
  }


  /**
   * 유저 서비스 - 예약 수정
   */
  async updateReservation({ reservationId, creatorId, updateReservationDto }: { reservationId: number, creatorId: number, updateReservationDto: UpdateReservationDto }) {

    const previousReservation = await this.prisma.reservation.findUnique({
      where: { reservationId },
      include: {
        participators: { select: { memberId: true } },
        borrowInstruments: { select: { instrumentId: true } }
      }
    });


    const nowTime = new Date(); // 현재 서버 시간 (KST)

    const previousDate = previousReservation.date; // 예약하려는 날짜

    // 예약 가능 마감 기한 (한국 시간 기준, 예약 날짜의 전날 22:00)
    const updateDeadline = new Date(previousDate);
    updateDeadline.setDate(previousDate.getDate() - 1);
    updateDeadline.setHours(22 - 9, 0, 0, 0);

    if (nowTime.getTime() > updateDeadline.getTime()) {
      throw new ForbiddenException('수정은 전날 22:00까지 가능합니다.');
    }

    if (!previousReservation) {
      throw new NotFoundException('해당 예약을 찾을 수 없습니다.');
    }

    if (previousReservation.creatorId != creatorId)
      throw new UnauthorizedException('권한이 없습니다.');

    const { date, startTime, endTime } = updateReservationDto;

    const reservedDate = date || previousReservation.date.toISOString().split('T')[0];
    const start = startTime || timeFormmatForClient(previousReservation.startTime);
    const end = endTime || timeFormmatForClient(previousReservation.endTime);

    const updatedDate = new Date(reservedDate); // 예약하려는 날짜

    // 예약 가능 마감 기한 (한국 시간 기준, 예약 날짜의 전날 22:00)
    const editDeadline = new Date(reservedDate);
    editDeadline.setDate(updatedDate.getDate() - 1);
    editDeadline.setHours(22 - 9, 0, 0, 0);

    if (nowTime.getTime() > editDeadline.getTime()) {
      throw new ForbiddenException('날짜 변경은 해당 날짜의 전날 22:00까지 가능합니다.');
    }

    return await this.prisma.$transaction(async (prisma) => {

      if (!!date || !!startTime || !!endTime) {
        // 예약 시간 중복 확인
        const hasOverlapReservation = await someConflictReservation(prisma, { date: reservedDate, endTime: end, startTime: start, notIncludeId: reservationId })

        if (!!hasOverlapReservation)
          throw new ConflictException('이미 해당 시간에 예약이 존재합니다.');
      }

      const { participationAvailable, title, reservationType, addedBorrowInstrumentIds, addedParticipatorIds, removedBorrowInstrumentIds, removedParticipatorIds } = updateReservationDto

      const updatedData = await prisma.reservation.update({
        where: { reservationId },
        data: {
          date: date ? dateFormmatForDB(reservedDate) : Prisma.skip,
          startTime: startTime ? timeFormmatForDB(start) : Prisma.skip,
          endTime: endTime ? timeFormmatForDB(end) : Prisma.skip,
          title: title ?? Prisma.skip,
          reservationType: reservationType ?? Prisma.skip,
          participationAvailable: participationAvailable ?? Prisma.skip,

          participators: (removedParticipatorIds || addedParticipatorIds) ? {
            disconnect: removedParticipatorIds ? removedParticipatorIds.map((memberId) => ({
              memberId
            })) : Prisma.skip,
            connect: addedParticipatorIds ? addedParticipatorIds.map((memberId) => ({
              memberId, // Prisma 스키마 기준
            })) : Prisma.skip,
          } : Prisma.skip,

          borrowInstruments: (removedBorrowInstrumentIds || addedBorrowInstrumentIds) ? {
            disconnect: removedBorrowInstrumentIds ? removedBorrowInstrumentIds.map((instrumentId) => ({
              instrumentId
            })) : Prisma.skip,
            connect: addedBorrowInstrumentIds ? addedBorrowInstrumentIds.map((instrumentId) => ({
              instrumentId, // Prisma 스키마 기준
            })) : Prisma.skip,
          } : Prisma.skip,
        },
        select: {
          title: true,
          reservationId: true,
          participators: { select: { memberId: true } }
        }
      })

      if (removedParticipatorIds)
        this.reservationNotification.kickedNotification({ participatorIds: removedParticipatorIds, title: updatedData.title, reservationId: updatedData.reservationId })
      this.reservationNotification.changedNotification({ participators: updatedData.participators.filter(value => value.memberId != creatorId), title: updatedData.title, reservationId: updatedData.reservationId })

      return { reservationId: updatedData.reservationId };
    }).catch((error: unknown) => {
      // PrismaClientKnownRequestError 처리
      if (error instanceof HttpException)
        throw error;

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('중복된 예약 정보가 존재합니다.');
        } else if (error.code === 'P2025') {
          throw new NotFoundException('해당 예약을 찾을 수 없습니다.');
        }
      }
      // PrismaClientValidationError 처리
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException('잘못된 요청 데이터입니다.');
      }

      // 그 외의 예상치 못한 에러 처리
      console.error('Unhandled error:', error);
      throw new InternalServerErrorException('예약 업데이트 중 알 수 없는 에러가 발생했습니다.');
    })

  }

  /**
   * 유저 서비스 - 예약 취소
   */
  async deleteReservation({ reservationId, creatorId }: { reservationId: number, creatorId: number }) {

    const previousReservation = await this.prisma.reservation.findUnique({
      where: { reservationId },
      include: {
        participators: { select: { memberId: true } },
        borrowInstruments: { select: { instrumentId: true } }
      }
    });

    const nowTime = new Date(); // 현재 서버 시간 (KST)

    const previousDate = previousReservation.date; // 예약하려는 날짜

    // 예약 가능 마감 기한 (한국 시간 기준, 예약 날짜의 전날 22:00)
    const updateDeadline = new Date(previousDate);
    updateDeadline.setDate(previousDate.getDate() - 1);
    updateDeadline.setHours(22 - 9, 0, 0, 0);

    if (nowTime.getTime() > updateDeadline.getTime()) {
      throw new ForbiddenException('수정은 전날 22:00까지 가능합니다.');
    }

    if (!previousReservation) {
      throw new NotFoundException('해당 예약을 찾을 수 없습니다.');
    }

    const deletedReservation = await this.prisma.reservation.delete({
      where: {
        reservationId, creatorId, // 복합 키 사용
      },
      include: { participators: { select: { memberId: true } } }
    });

    this.reservationNotification.deletedNotification({ participators: deletedReservation.participators.filter(value => value.memberId != creatorId), title: deletedReservation.title })

    return { message: '삭제 성공' };

  }


  /**
   * 유저 서비스 - 예약에서 나가기
   */
  async leaveReservation({ reservationId, memberId }: { reservationId: number, memberId: number }) {

    const previousReservation = await this.prisma.reservation.findUnique({
      where: { reservationId },
      include: {
        participators: { select: { memberId: true } },
        borrowInstruments: { select: { instrumentId: true } }
      }
    });

    const nowTime = new Date(); // 현재 서버 시간 (KST)

    const previousDate = previousReservation.date; // 예약하려는 날짜

    // 예약 가능 마감 기한 (한국 시간 기준, 예약 날짜의 전날 22:00)
    const updateDeadline = new Date(previousDate);
    updateDeadline.setDate(previousDate.getDate() - 1);
    updateDeadline.setHours(22 - 9, 0, 0, 0);

    if (nowTime.getTime() > updateDeadline.getTime()) {
      throw new ForbiddenException('예약에서 나가기는 전날 22:00까지 가능합니다.');
    }

    if (!previousReservation) {
      throw new NotFoundException('해당 예약을 찾을 수 없습니다.');
    }

    const reservation = await this.prisma.reservation.update({
      where: {
        reservationId,
      },
      data: {
        participators: {
          disconnect: {
            memberId,
          },
        },
      },
      select: {
        creatorId: true,
        title: true
      }
    });

    const memberInformation = await this.prisma.member.findUnique({
      where: { memberId },
      select: { name: true }
    })

    this.reservationNotification.participatorExitedNotification(reservation.creatorId, memberInformation.name, reservation.title, reservationId)

    return { message: 'Success' };
  }
}