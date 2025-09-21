import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import {
  IReservationRepository,
  OccupiedTimeReadModel,
  ReservationTransaction,
} from 'src/features/reservation/application/ports/out/reservation.repository.port';
import { Prisma } from '@prisma/client';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { ReservationPrismaMapper } from './mappers/reservation.prisma.mapper';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';

@Injectable()
export class PrismaReservationRepository implements IReservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly entityInclude = {
    creator: { include: { club: true, roleAssignment: true } },
    borrowInstruments: { include: { club: true } },
    participators: { include: { club: true, roleAssignment: true } },
  } as const;

  // === 조회 메서드 ===

  async findTodayReservationsByMemberId(
    memberId: number,
    date: Date,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity[]> {
    const client = (tx as any) || this.prisma;
    const reservations = await client.reservation.findMany({
      where: {
        participators: { some: { memberId } },
        date: date,
      },
      include: this.entityInclude,
    });
    return reservations.map((reservation) =>
      ReservationPrismaMapper.toEntity(reservation),
    );
  }

  async findNextReservationsByMemberId(
    memberId: number,
    startDate: Date,
    skip: number,
    take: number,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity[]> {
    const client = (tx as any) || this.prisma;
    const reservations = await client.reservation.findMany({
      where: {
        participators: { some: { memberId } },
        date: { gte: startDate },
      },
      include: this.entityInclude,
      skip: skip * 10,
      take: take,
    });
    return reservations.map((reservation) =>
      ReservationPrismaMapper.toEntity(reservation),
    );
  }

  async findReservationsByTerm(
    startDate: Date,
    endDate: Date,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity[]> {
    const client = (tx as any) || this.prisma;
    const reservations = await client.reservation.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: this.entityInclude,
    });
    return reservations.map((reservation) =>
      ReservationPrismaMapper.toEntity(reservation),
    );
  }

  async findReservationsByMonth(
    startDate: Date,
    endDate: Date,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity[]> {
    const client = (tx as any) || this.prisma;
    const reservations = await client.reservation.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: this.entityInclude,
    });
    return reservations.map((reservation) =>
      ReservationPrismaMapper.toEntity(reservation),
    );
  }

  async findReservationsByDate(
    date: Date,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity[]> {
    const client = (tx as any) || this.prisma;
    const reservations = await client.reservation.findMany({
      where: { date },
      include: this.entityInclude,
    });
    return reservations.map((reservation) =>
      ReservationPrismaMapper.toEntity(reservation),
    );
  }

  async findOccupiedTimesByDate(
    date: Date,
    tx?: ReservationTransaction,
  ): Promise<OccupiedTimeReadModel[]> {
    const client = (tx as any) || this.prisma;
    return client.reservation.findMany({
      where: { date },
      select: {
        creator: { select: { name: true } },
        externalCreatorName: true,
        title: true,
        reservationType: true,
        reservationId: true,
        startTime: true,
        endTime: true,
      },
    }) as Promise<OccupiedTimeReadModel[]>;
  }

  async findReservationDetail(
    reservationId: number,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity | null> {
    const client = (tx as any) || this.prisma;
    const reservation = await client.reservation.findUnique({
      where: { reservationId },
      include: this.entityInclude,
    });
    if (!reservation) return null;
    return ReservationPrismaMapper.toEntity(reservation);
  }

  async findReservationById(
    reservationId: number,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity | null> {
    const client = (tx as any) || this.prisma;
    const reservation = await client.reservation.findUnique({
      where: { reservationId },
      include: this.entityInclude,
    });

    if (!reservation) {
      return null;
    }

    return ReservationPrismaMapper.toEntity(reservation);
  }

  async findReservationsByIds(
    reservationIds: number[],
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity[]> {
    const client = (tx as any) || this.prisma;
    const reservations = await client.reservation.findMany({
      where: { reservationId: { in: reservationIds } },
      include: this.entityInclude,
    });

    return reservations.map((reservation) =>
      ReservationPrismaMapper.toEntity(reservation),
    );
  }

  async findReservationsForSchedulerByDate(
    date: Date,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity[]> {
    const client = (tx as any) || this.prisma;
    const reservations = await client.reservation.findMany({
      where: {
        date,
      },
      include: this.entityInclude,
      orderBy: { startTime: 'asc' },
    });

    return reservations.map((reservation) =>
      ReservationPrismaMapper.toEntity(reservation),
    );
  }

  // === 생성/수정/삭제 ===

  private getInternalCreatorMemberId(reservation: ReservationEntity): number {
    if (typeof reservation.creator === 'string') {
      throw new Error('REGULAR/COMMON 예약에는 회원 creator가 필요합니다.');
    }
    return reservation.creator.memberId;
  }

  private buildCreatorSnapshot(creator: ReservationCreator) {
    return {
      memberId: creator.memberId,
      name: creator.name,
      nickname: creator.nickname,
      email: creator.email,
      enrollmentNumber: creator.enrollmentNumber,
      profileImageUrl: creator.profileImageUrl,
      blogUrl: creator.blogUrl,
      instagramUrl: creator.instagramUrl,
      clubName: creator.clubName,
      roles: creator.roles,
    };
  }

  private async createInternalReservation(
    reservation: ReservationEntity,
    client: any,
  ) {
    const data: Prisma.ReservationCreateInput = {
      date: reservation.date,
      startTime: AppKstDateTime.timeFormmatForDB(reservation.startTime),
      endTime: AppKstDateTime.timeFormmatForDB(reservation.endTime),
      title: reservation.title,
      reservationType: reservation.reservationType,
      participationAvailable: reservation.participationAvailable,
      creator: {
        connect: { memberId: this.getInternalCreatorMemberId(reservation) },
      },
      creatorSnapshot:
        reservation.creator instanceof ReservationCreator
          ? this.buildCreatorSnapshot(reservation.creator)
          : null,
      externalCreatorName: null,
      participators: {
        connect: reservation.participators.map((p) => ({
          memberId: p.memberId,
        })),
      },
      borrowInstruments: {
        connect: reservation.borrowInstruments.map((b) => ({
          instrumentId: b.instrumentId,
        })),
      },
    };

    return client.reservation.create({
      data,
      include: this.entityInclude,
    });
  }

  private async createExternalReservation(
    reservation: ReservationEntity,
    client: any,
  ) {
    if (typeof reservation.creator !== 'string') {
      throw new Error('EXTERNAL 예약에는 external creator 이름이 필요합니다.');
    }

    const externalCreatorName = reservation.creator.trim();
    if (!externalCreatorName) {
      throw new Error('EXTERNAL 예약에는 external creator 이름이 필요합니다.');
    }

    const data: Prisma.ReservationCreateInput = {
      date: reservation.date,
      startTime: AppKstDateTime.timeFormmatForDB(reservation.startTime),
      endTime: AppKstDateTime.timeFormmatForDB(reservation.endTime),
      title: reservation.title,
      reservationType: 'EXTERNAL',
      participationAvailable: reservation.participationAvailable,
      externalCreatorName,
      participators: {
        connect: reservation.participators.map((p) => ({
          memberId: p.memberId,
        })),
      },
      borrowInstruments: {
        connect: reservation.borrowInstruments.map((b) => ({
          instrumentId: b.instrumentId,
        })),
      },
    };

    return client.reservation.create({
      data,
      include: this.entityInclude,
    });
  }

  private async updateInternalReservation(
    reservation: ReservationEntity,
    client: any,
  ) {
    if (!reservation.reservationId) {
      throw new Error('Reservation id is required for update');
    }

    const data: Prisma.ReservationUpdateInput = {
      date: reservation.date,
      startTime: AppKstDateTime.timeFormmatForDB(reservation.startTime),
      endTime: AppKstDateTime.timeFormmatForDB(reservation.endTime),
      title: reservation.title,
      reservationType: reservation.reservationType,
      participationAvailable: reservation.participationAvailable,
      creator: {
        connect: { memberId: this.getInternalCreatorMemberId(reservation) },
      },
      externalCreatorName: null,
      participators: {
        set: reservation.participators.map((p) => ({ memberId: p.memberId })),
      },
      borrowInstruments: {
        set: reservation.borrowInstruments.map((b) => ({
          instrumentId: b.instrumentId,
        })),
      },
    };

    return client.reservation.update({
      where: { reservationId: reservation.reservationId },
      data,
      include: this.entityInclude,
    });
  }

  private async updateExternalReservation(
    reservation: ReservationEntity,
    client: any,
  ) {
    if (!reservation.reservationId) {
      throw new Error('Reservation id is required for update');
    }
    if (typeof reservation.creator !== 'string') {
      throw new Error('EXTERNAL 예약에는 external creator 이름이 필요합니다.');
    }

    const externalCreatorName = reservation.creator.trim();
    if (!externalCreatorName) {
      throw new Error('EXTERNAL 예약에는 external creator 이름이 필요합니다.');
    }

    const data: Prisma.ReservationUpdateInput = {
      date: reservation.date,
      startTime: AppKstDateTime.timeFormmatForDB(reservation.startTime),
      endTime: AppKstDateTime.timeFormmatForDB(reservation.endTime),
      title: reservation.title,
      reservationType: 'EXTERNAL',
      participationAvailable: reservation.participationAvailable,
      creator: { disconnect: true },
      externalCreatorName,
      participators: {
        set: reservation.participators.map((p) => ({ memberId: p.memberId })),
      },
      borrowInstruments: {
        set: reservation.borrowInstruments.map((b) => ({
          instrumentId: b.instrumentId,
        })),
      },
    };

    return client.reservation.update({
      where: { reservationId: reservation.reservationId },
      data,
      include: this.entityInclude,
    });
  }

  async save(
    reservation: ReservationEntity,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity> {
    const client = (tx as any) || this.prisma;
    const isExternal = reservation.reservationType === 'EXTERNAL';

    let savedReservation;
    if (reservation.reservationId) {
      savedReservation = isExternal
        ? await this.updateExternalReservation(reservation, client)
        : await this.updateInternalReservation(reservation, client);
    } else {
      savedReservation = isExternal
        ? await this.createExternalReservation(reservation, client)
        : await this.createInternalReservation(reservation, client);
    }

    if (
      savedReservation.reservationType !== 'EXTERNAL' &&
      !savedReservation.creator
    ) {
      throw new Error('Creator is required for ReservationEntity');
    }

    return ReservationPrismaMapper.toEntity(savedReservation);
  }

  async delete(
    reservationId: number,
    tx?: ReservationTransaction,
  ): Promise<void> {
    const client = (tx as any) || this.prisma;
    await client.reservation.delete({
      where: { reservationId },
    });
  }

  async deleteReservationsByIds(
    reservationIds: number[],
    tx?: ReservationTransaction,
  ): Promise<{ count: number }> {
    const client = (tx as any) || this.prisma;
    return client.reservation.deleteMany({
      where: { reservationId: { in: reservationIds } },
    });
  }

  async deleteManyReservations(
    where: { reservationId: { in: number[] } },
    tx?: ReservationTransaction,
  ): Promise<{ count: number }> {
    const client = (tx as any) || this.prisma;
    return client.reservation.deleteMany({ where });
  }

  // === Raw Query ===

  async findConflictReservations(
    options: {
      date: string;
      startTime: string;
      endTime: string;
      notIncludeId?: number;
    },
    tx?: ReservationTransaction,
  ): Promise<{ reservationId: number }[]> {
    const client = (tx as any) || this.prisma;
    const { date, startTime, endTime, notIncludeId } = options;

    const dateYmd = AppKstDateTime.kstCalendarYmdFromDbOrString(date);
    const newStart = AppKstDateTime.timeFormmatForDB(startTime);
    const newEnd = AppKstDateTime.timeFormmatForDB(endTime);
    const endTimeBind = AppKstDateTime.timeFormmatForClient(newEnd);
    const startTimeBind = AppKstDateTime.timeFormmatForClient(newStart);

    if (notIncludeId) {
      const findReservations = (await client.$queryRawUnsafe(
        `
        SELECT reservationId
        FROM Reservation
        WHERE date = ?
        AND NOT reservationId = ?
        AND startTime < ?
        AND endTime > ?;
      `,
        dateYmd,
        notIncludeId,
        endTimeBind,
        startTimeBind,
      )) as { reservationId: number }[];

      return findReservations || [];
    } else {
      const findReservations = (await client.$queryRawUnsafe(
        `
          SELECT reservationId
          FROM Reservation
          WHERE date = ?
          AND startTime < ?
          AND endTime > ?;
        `,
        dateYmd,
        endTimeBind,
        startTimeBind,
      )) as { reservationId: number }[];

      return findReservations || [];
    }
  }

  async someConflictReservation(
    options: {
      date: string;
      startTime: string;
      endTime: string;
      notIncludeId?: number;
    },
    tx?: ReservationTransaction,
  ): Promise<boolean> {
    const client = (tx as any) || this.prisma;
    const { date, startTime, endTime, notIncludeId } = options;

    const dateYmd = AppKstDateTime.kstCalendarYmdFromDbOrString(date);
    const newStart = AppKstDateTime.timeFormmatForDB(startTime);
    const newEnd = AppKstDateTime.timeFormmatForDB(endTime);
    const endTimeBind = AppKstDateTime.timeFormmatForClient(newEnd);
    const startTimeBind = AppKstDateTime.timeFormmatForClient(newStart);

    if (notIncludeId) {
      const someConflictReservation = (await client.$queryRawUnsafe(
        `
        SELECT reservationId
        FROM Reservation
        WHERE date = ?
        AND NOT reservationId = ?
        AND startTime < ?
        AND endTime > ?
        LIMIT 1;
      `,
        dateYmd,
        notIncludeId,
        endTimeBind,
        startTimeBind,
      )) as { reservationId: number }[];

      return someConflictReservation.length > 0 || false;
    } else {
      const someConflictReservation = (await client.$queryRawUnsafe(
        `
          SELECT reservationId
          FROM Reservation
          WHERE date = ?
          AND startTime < ?
          AND endTime > ?
          LIMIT 1;
        `,
        dateYmd,
        endTimeBind,
        startTimeBind,
      )) as { reservationId: number }[];

      return someConflictReservation.length > 0 || false;
    }
  }

  // === 트랜잭션 ===

  async transaction<T>(
    callback: (tx: ReservationTransaction) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction((tx) => callback(tx));
  }
}
