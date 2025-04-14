import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateInstrumentDto } from './dto/create-instrument.dto';
import { UpdateInstrumentDto } from './dto/update-instrument.dto';
import { PrismaService } from 'src/prisma.service';
import { InstrumentEnum } from './instrument.enum';
import { NotificationService } from 'src/notification/notification.service';



@Injectable()
export class InstrumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly instrumentType: InstrumentEnum,
    private readonly notificationService: NotificationService
  ) { }
  /**
   * 어드민 전용 - 전체 악기 조회회
   */
  // async findAll() {
  //   const borrowPossibleList = await this.prisma.instrument.findMany({
  //     select: {
  //       instrumentId: true,
  //       instrumentType: true,
  //       name: true,
  //       imageUrl: true,
  //       club: { select: { clubName: true } },
  //     }
  //   })

  //   return borrowPossibleList.map(instrument => ({
  //     ...instrument,
  //     instrumentType: this.instrumentType.EnToKo(instrument.instrumentType),
  //     club: instrument.club.clubName
  //   }))
  // }

  /**
   * 유저 전용 - 대여가능 악기 조회
   * @param clubId 
   */
  async borrowPossibleList(clubId: number | null) {
    const borrowPossibleList = await this.prisma.instrument.findMany({
      where: { clubId: { not: clubId }, borrowAvailable: true },
      select: {
        instrumentId: true,
        instrumentType: true,
        name: true,
        imageUrl: true,
        club: { select: { clubName: true } },
      }
    })

    return borrowPossibleList.map(instrument => ({
      ...instrument,
      instrumentType: this.instrumentType.EnToKo(instrument.instrumentType),
      club: instrument.club.clubName
    }))
  }


  /**
   * 공용 - 악기 정보 상세 조회
   * @param instrumentId 
   */
  async findDetail(instrumentId: number) {
    const instrument = await this.prisma.instrument.findUnique({
      where: { instrumentId },
      select: {
        instrumentId: true,
        borrowAvailable: true,
        club: { select: { clubName: true } },
        borrowHistory: {
          select: {
            sessionId: true,
            title: true,
            creator: { select: { name: true, nickname: true } },
            externalCreatorName: true,
            date: true,
            returnImageUrl: true
          }
        },
        instrumentType: true,
        name: true,
        imageUrl: true,
      }
    })

    return {
      ...instrument,
      club: instrument.club?.clubName,
      instrumentType: this.instrumentType.EnToKo(instrument.instrumentType),
      borrowHistory: instrument.borrowHistory.map((rawData) => {
        if (!!rawData.creator.name)
          return ({
            sessionId: rawData.sessionId,
            title: rawData.title,
            date: rawData.date,
            creatorName: rawData.creator.name,
            creatorNicname: rawData.creator.nickname,
            retrunImages: rawData.returnImageUrl,
          })
        else
          return ({
            sessionId: rawData.sessionId,
            title: rawData.title,
            date: rawData.date,
            creatorName: rawData.externalCreatorName,
            retrunImages: rawData.returnImageUrl
          })
      })
    }
  }


  // async adminCreate(createInstrumentDto: AdminCreateInstrumentDto) {

  //   return await this.prisma.instrument.create({
  //     data: {
  //       instrumentType: this.instrumentType.KoToEn(createInstrumentDto.instrumentType),
  //       name: createInstrumentDto.name,
  //       clubId: createInstrumentDto.clubId,
  //       borrowAvailable: true
  //     }
  //   })
  // }


  async create({ memberId, createInstrumentDto }: { memberId: number, createInstrumentDto: CreateInstrumentDto }) {

    const user = await this.prisma.member.findUnique({
      where: { memberId },
      select: {
        clubId: true,
        roleAssignment: { select: { role: true } }
      }
    });
    if (user.roleAssignment.length == 0) throw new UnauthorizedException('권한이 없습니다.')

    return await this.prisma.instrument.create({
      data: {
        clubId: user.clubId,
        imageUrl: createInstrumentDto.imageUrl,
        instrumentType: this.instrumentType.KoToEn(createInstrumentDto.instrumentType),
        name: createInstrumentDto.name,
        borrowAvailable: true
      }
    })
  }

  // async adminUpdate(instrumentId: number, updateInstrumentDto: UpdateInstrumentDto) {

  //   return await this.prisma.instrument.update({
  //     where: { instrumentId },
  //     data: {
  //       ...updateInstrumentDto,
  //       instrumentType: this.instrumentType.KoToEn(updateInstrumentDto.instrumentType),
  //     }
  //   })

  // }

  async update(memberId: number, instrumentId: number, updateInstrumentDto: UpdateInstrumentDto) {

    const user = await this.prisma.member.findUnique({
      where: { memberId },
      select: {
        clubId: true,
        roleAssignment: { select: { role: true } }
      }
    });
    if (user.roleAssignment.length == 0) throw new UnauthorizedException('권한이 없습니다.')

    if (updateInstrumentDto.borrowAvailable === false) {
      const isBorrowedReservations = await this.prisma.reservation.findMany({
        where: {
          session: null, // session이 존재하지 않는 예약들
          borrowInstruments: {
            some: { instrumentId: instrumentId }, // 해당 Instrument가 포함된 예약들
          },
        }
      });
      if (isBorrowedReservations.length > 0)
        return this.prisma.$transaction(async (prisma) => {

          await Promise.all(
            isBorrowedReservations.map((reservation) => {
              this.notificationService.sendPushNotifications({ to: [reservation.creatorId], title: '예약 변경 사항', body: '대여 악기 중 일부가 대여 불가 합니다..\n대여 악기 목록에서 삭제되었습니다.', data: { reservationId: reservation.reservationId } })
              return (prisma.reservation.update({
                where: {
                  reservationId: reservation.reservationId
                },
                data: {
                  borrowInstruments: {
                    disconnect: [{ instrumentId: instrumentId }], // 특정 Instrument와의 관계를 배열 형식으로 끊기
                  },
                },
              }))
            })
          )

          return await prisma.instrument.update({
            where: { instrumentId, clubId: user.clubId },
            data: {
              ...updateInstrumentDto,
              instrumentType: this.instrumentType.KoToEn(updateInstrumentDto.instrumentType),
            }
          })
        })
    }

    return await this.prisma.instrument.update({
      where: { instrumentId, clubId: user.clubId },
      data: {
        ...updateInstrumentDto,
        instrumentType: this.instrumentType.KoToEn(updateInstrumentDto.instrumentType),
      }
    })
  }


  // async adminRemove(instrumentId: number) {
  //   return await this.prisma.instrument.delete({
  //     where: { instrumentId }
  //   })
  // }

  async remove(memberId: number, instrumentId: number) {
    const user = await this.prisma.member.findUnique({
      where: { memberId },
      select: {
        clubId: true,
        roleAssignment: { select: { role: true } }
      }
    });
    if (user.roleAssignment.length == 0) throw new UnauthorizedException('권한이 없습니다.')

    {
      const isBorrowedReservations = await this.prisma.reservation.findMany({
        where: {
          session: null, // session이 존재하지 않는 예약들
          borrowInstruments: {
            some: { instrumentId: instrumentId }, // 해당 Instrument가 포함된 예약들
          },
        }
      });
      if (isBorrowedReservations.length > 0)
        return this.prisma.$transaction(async (prisma) => {

          await Promise.all(
            isBorrowedReservations.map((reservation) => {
              this.notificationService.sendPushNotifications({ to: [reservation.creatorId], title: '예약 변경 사항', body: '대여 악기 중 일부가 대여 불가 합니다.\n대여 악기 목록에서 삭제되었습니다.', data: { reservationId: reservation.reservationId } })
              return (prisma.reservation.update({
                where: {
                  reservationId: reservation.reservationId
                },
                data: {
                  borrowInstruments: {
                    disconnect: [{ instrumentId: instrumentId }], // 특정 Instrument와의 관계를 배열 형식으로 끊기
                  },
                },
              }))
            })
          )

          return await this.prisma.instrument.delete({
            where: { instrumentId, clubId: user.clubId }
          })
        })
    }

    return await this.prisma.instrument.delete({
      where: { instrumentId, clubId: user.clubId }
    })
  }
}

export { InstrumentEnum as InstrumentType };
