import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Prisma, reservationType } from "@prisma/client";
import { FirebaseService } from "src/firebase/firebase.service";
import { PrismaService } from "src/prisma.service";
import { BatchReservtionDTO } from "./dto/batch-reservation.dto";
import { ForceCreateReservationDto } from "./dto/create-reservation.dto";
import { ForceUpdateReservationDto } from "./dto/update-reservation.dto";
import { timeFormmatForDB } from "./reservation.utils";
import { ReservationNotificationService } from "./reservation-notification.service";
import { findConflictReservations } from "./reservation.query-raw";

@Injectable()
export class AdminReservationService {

    constructor(
        private readonly firebaseService: FirebaseService,
        private readonly prisma: PrismaService,
        private readonly reservationNotification: ReservationNotificationService
    ) {

    }
    /**
     * 관리자 서비스 - 강제 삭제
     * */
    async adminForceDeleteReservation({ reservationId, adminId }: { reservationId: number, adminId: number }) {
        try {

            const adminInfo = await this.prisma.member.findUnique({
                where: { memberId: adminId },
                select: { adminLevel: true }
            })

            if (!adminInfo.adminLevel) throw new UnauthorizedException('권한이 없습니다.')

            const reservation = await this.prisma.reservation.delete({
                where: {
                    reservationId, // 복합 키 사용
                },
                select: {
                    participators: { select: { memberId: true } },
                    title: true
                }
            });

            this.reservationNotification.forceDeleteNotification({ participators: reservation.participators, title: reservation.title })

            return { message: '삭제 성공' };
        } catch (error) {
            if (error.code === 'P2025') {
                // Prisma 오류 코드 P2025: 레코드를 찾을 수 없음
                throw new NotFoundException('해당 예약을 찾을 수 없습니다.');
            }
            throw error; // 다른 오류 재전송
        }
    }

    /**
     * 관리자 서비스 - 강제 추가
     * */
    async adminCreateReservation({ createReservationDto, adminId }: { createReservationDto: ForceCreateReservationDto, adminId: number }) {

        const adminInfo = await this.prisma.member.findUnique({
            where: { memberId: adminId },
            select: { adminLevel: true }
        })

        if (!adminInfo || !adminInfo.adminLevel) throw new UnauthorizedException('권한이 없습니다.')

        const { date: selectedDate, startTime, endTime } = createReservationDto;

        const reservationDate = new Date(`${selectedDate}`)

        if (reservationDate < new Date()) throw new BadRequestException('유효한 날짜가 아닙니다.')

        const newStart = timeFormmatForDB(startTime)
        const newEnd = timeFormmatForDB(endTime)

        // 예약 시간 중복 확인
        return await this.prisma.$transaction(async prisma => {

            const overlappingReservations = await findConflictReservations(prisma, { date: selectedDate, endTime, startTime })

            if (overlappingReservations.length > 0) {
                const reservationsInfo = await prisma.reservation.findMany({
                    where: { reservationId: { in: overlappingReservations.map(res => res.reservationId) } },
                    select: {
                        reservationId: true,
                        participators: { select: { memberId: true } },
                        title: true
                    },
                });

                // 2. 데이터 삭제
                await prisma.reservation.deleteMany({
                    where: { reservationId: { in: overlappingReservations.map(res => res.reservationId) } },
                });

                await Promise.all(
                    reservationsInfo.map(async (res) => {
                        if (res.participators.length == 0) return;
                        return await this.reservationNotification.forceDeleteNotification({ participators: res.participators, title: res.title });
                    })
                )

            }

            const { participationAvailable, title, reservationType, externalCreatorName, creatorId } = createReservationDto

            if (reservationType == 'EXTERNAL') {

                await prisma.reservation.create({
                    data: {
                        date: new Date(selectedDate),
                        startTime: newStart,
                        endTime: newEnd,

                        creatorId: null,
                        externalCreatorName,

                        title,
                        reservationType,
                        participationAvailable,

                    }
                })

            } else {

                const reservation = await prisma.reservation.create({
                    data: {
                        date: new Date(selectedDate),
                        startTime: newStart,
                        endTime: newEnd,

                        creatorId,
                        externalCreatorName: null,

                        title,
                        reservationType,
                        participationAvailable,
                        participators: {
                            connect: [creatorId].map((memberId) => ({
                                memberId, // Prisma 스키마 기준
                            })),
                        },
                    }
                })

                this.reservationNotification.forceAllocatedNotification(creatorId, reservation.reservationId);
            }

            return { message: 'Success' };

        }).catch((error: unknown) => {

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
     * 관리자 서비스 - 강제 수정
     * */
    async adminEditReservation({ reservationId, adminId, updateReservationDto }: { reservationId: number, adminId: number, updateReservationDto: ForceUpdateReservationDto }) {

        const { adminLevel } = await this.prisma.member.findUnique({
            where: { memberId: adminId },
            select: { adminLevel: true }
        })

        if (!adminLevel) throw new UnauthorizedException('권한이 없습니다.')

        const previousReservation = await this.prisma.reservation.findUnique({
            where: { reservationId },
            include: { participators: { select: { memberId: true } } }
        });

        if (!previousReservation) {
            throw new ConflictException('해당 예약을 찾을 수 없습니다.');
        }

        const { date, startTime, endTime } = updateReservationDto;

        const reservedDate = date ? new Date(`${date}`) : previousReservation.date;

        const start = startTime ? timeFormmatForDB(startTime) : previousReservation.startTime;
        const end = endTime ? timeFormmatForDB(endTime) : previousReservation.endTime;


        return await this.prisma.$transaction(async prisma => {

            if (date || startTime || endTime) {

                const overlappingReservations = await findConflictReservations(prisma, { date, endTime, startTime, notIncludeId: reservationId })

                console.log(overlappingReservations)

                if (overlappingReservations.length > 0) {
                    const reservationsInfo = await prisma.reservation.findMany({
                        where: { reservationId: { in: overlappingReservations.map(res => res.reservationId) } },
                        select: {
                            reservationId: true,
                            participators: { select: { memberId: true } },
                            title: true
                        },
                    });

                    // 2. 데이터 삭제
                    await prisma.reservation.deleteMany({
                        where: { reservationId: { in: overlappingReservations.map(res => res.reservationId) } },
                    });

                    await Promise.all(
                        reservationsInfo.map(async (res) => {
                            if (res.participators.length == 0) return;
                            return await this.reservationNotification.forceDeleteNotification({ participators: res.participators, title: res.title });
                        })
                    )
                }
            }

            const { participationAvailable, title, reservationType, externalCreatorName, creatorId } = updateReservationDto;

            if (reservationType == 'EXTERNAL') {

                await prisma.reservation.update({
                    where: { reservationId },
                    data: {
                        date: date ? reservedDate : Prisma.skip,
                        startTime: startTime ? start : Prisma.skip,
                        endTime: endTime ? end : Prisma.skip,
                        creatorId: null,
                        externalCreatorName: externalCreatorName ? externalCreatorName : Prisma.skip,
                        title: title ? title : Prisma.skip,
                        reservationType: reservationType ? reservationType : Prisma.skip,
                        participationAvailable: participationAvailable ? participationAvailable : Prisma.skip,
                        participators: {
                            set: []
                        }
                    }
                })

            } else {

                await prisma.reservation.update({
                    where: { reservationId },
                    data: {
                        date: date ? reservedDate : Prisma.skip,
                        startTime: startTime ? start : Prisma.skip,
                        endTime: endTime ? end : Prisma.skip,
                        creatorId: creatorId ? creatorId : Prisma.skip,
                        externalCreatorName: externalCreatorName ? externalCreatorName : Prisma.skip,
                        title: title ? title : Prisma.skip,
                        reservationType: reservationType ? reservationType : Prisma.skip,
                        participationAvailable: participationAvailable ? participationAvailable : Prisma.skip,

                        participators: creatorId ? previousReservation.participators.some(member => member.memberId == creatorId) ? {
                            connect: [...previousReservation.participators.map(member => member.memberId), creatorId].map((memberId) => ({
                                memberId, // Prisma 스키마 기준
                            })),
                        } : Prisma.skip : Prisma.skip,
                    }
                })

                this.reservationNotification.forceChangeNotification({ participators: previousReservation.participators, title: previousReservation.title, reservationId: previousReservation.reservationId })

            }

            return { message: 'Success' };

        }).catch((error: unknown) => {

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
     * 관리자 서비스 - batch 추가
     * */

    async adminRigisterRoutineReservation<T extends reservationType>(adminId: number, batchReservationDTO: BatchReservtionDTO<T>) {

        const { name: adminName, adminLevel } = await this.prisma.member.findUnique({
            where: { memberId: adminId },
            select: { name: true, adminLevel: true }
        })


        if (adminLevel != 'SUPER') throw new UnauthorizedException('권한이 없습니다.')

        const { dayTimes: dates, duration, batchReservationOption } = batchReservationDTO;

        const dayMap: Record<string, number> = {
            일: 0,
            월: 1,
            화: 2,
            수: 3,
            목: 4,
            금: 5,
            토: 6,
        };

        console.log({ ...batchReservationDTO })
        
        const option: Record<string, string | number> = { createdAdminName: adminName, reservationType: batchReservationOption.reservationType, title: batchReservationOption.title }

        if (batchReservationOption.reservationType == 'EXTERNAL')
            option.creatorName = batchReservationOption.creatorName;
        else {
            const requestUserInfo = await this.prisma.member.findUnique({
                where: {
                    memberId: batchReservationOption.creatorId
                }, select: {
                    name: true
                }
            })

            option.creatorName = requestUserInfo.name;
            option.creatorId = batchReservationOption.creatorId;
        }

        const { startDate, endDate } = duration;
        const start = new Date(startDate)
        const end = new Date(endDate)

        return await this.prisma.$transaction(async (prisma) => {

            let currentDate = start;
            while (currentDate <= end) {

                const currentDay = currentDate.getDay();
                // 해당 날짜에 예약할 요일인지 확인
                const dayReservation = dates.find((d) => dayMap[d.day] === currentDay);

                if (dayReservation) {

                    const { startTime, endTime } = dayReservation;

                    // 날짜와 시간을 결합하여 DateTime 객체 생성
                    const reservationDate = currentDate;
                    const date = reservationDate.toISOString().split('T')[0]
                    const newStart = timeFormmatForDB(startTime)
                    const newEnd = timeFormmatForDB(endTime)

                    const overlappingReservations = await findConflictReservations(prisma, {
                        date: reservationDate.toISOString().split('T')[0],
                        endTime: newEnd.toUTCString().split(' ')[4],
                        startTime: newStart.toUTCString().split(' ')[4]
                    })

                    if (overlappingReservations.length > 0) {
                        const reservationsInfo = await prisma.reservation.findMany({
                            where: { reservationId: { in: overlappingReservations.map(res => res.reservationId) } },
                            select: {
                                reservationId: true,
                                participators: { select: { memberId: true } },
                                title: true
                            },
                        });

                        // 2. 데이터 삭제
                        await prisma.reservation.deleteMany({
                            where: { reservationId: { in: overlappingReservations.map(res => res.reservationId) } },
                        });


                        reservationsInfo.map(async (res) => {
                            if (res.participators.length == 0) return;
                            return await this.reservationNotification.forceDeleteNotification({ participators: res.participators, title: res.title });
                        })
                    }

                    // 새로운 예약 생성
                    if (batchReservationOption.reservationType == 'EXTERNAL') {
                        await prisma.reservation.create({
                            data: {
                                date: reservationDate,
                                startTime: newStart,
                                endTime: newEnd,
                                title: batchReservationOption.title,
                                externalCreatorName: batchReservationOption.creatorName,
                                reservationType: 'EXTERNAL',
                                participationAvailable: false
                            },
                        });
                    }
                    else {
                        const createdReservation = await prisma.reservation.create({
                            data: {
                                date: reservationDate,
                                startTime: newStart,
                                endTime: newEnd,
                                title: batchReservationOption.title,
                                creatorId: batchReservationOption.creatorId,
                                reservationType: batchReservationOption.reservationType,
                                participationAvailable: false,
                                participators: {
                                    connect: {
                                        memberId: batchReservationOption.creatorId, // Prisma 스키마 기준
                                    },
                                },
                            },
                        });

                        this.reservationNotification.forceAllocatedNotification(batchReservationOption.creatorId, createdReservation.reservationId);

                    }
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            this.firebaseService.createBatchLog({ dates, duration, option })

            return { message: 'Routine reservations registered successfully' };

        }).catch((error: unknown) => {

            // PrismaClientValidationError 처리
            if (error instanceof Prisma.PrismaClientValidationError) {
                throw new BadRequestException('잘못된 요청 데이터입니다.');
            }

            // 그 외의 예상치 못한 에러 처리
            console.error('Unhandled error:', error);
            throw new InternalServerErrorException('예약 업데이트 중 알 수 없는 에러가 발생했습니다.');
        })
    }
}