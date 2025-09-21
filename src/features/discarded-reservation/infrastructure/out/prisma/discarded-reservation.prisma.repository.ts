import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { IDiscardedReservationRepository } from 'src/features/discarded-reservation/application/ports/out/discarded-reservation.repository.port';
import {
  DiscardedReservationListVO,
  DiscardReason,
} from 'src/features/discarded-reservation/domain/discarded-reservation.vo';
import { DiscardedReservationPrismaMapper } from './mappers/discarded-reservation.prisma.mapper';

@Injectable()
export class PrismaDiscardedReservationRepository
  implements IDiscardedReservationRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async saveNoShowByReservationId(
    reservationId: number,
    reason?: DiscardReason,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { reservationId },
        include: {
          creator: { include: { club: true, roleAssignment: true } },
          participators: { include: { club: true, roleAssignment: true } },
          borrowInstruments: { include: { club: true } },
        },
      });
      if (!reservation) return;

      const reservationSnapshot =
        DiscardedReservationPrismaMapper.toReservationSnapshot(reservation);

      await tx.discardedReservation.upsert({
        where: { reservationId: reservation.reservationId },
        update: {
          reservationSnapshot,
          discardedByType: 'SYSTEM',
          discardReason: reason ?? 'NO_SHOW',
        },
        create: {
          reservationId: reservation.reservationId,
          reservationSnapshot,
          discardedByType: 'SYSTEM',
          discardReason: reason ?? 'NO_SHOW',
        },
      });
    });
  }

  async findLatest(
    skip: number = 0,
    take: number = 20,
  ): Promise<DiscardedReservationListVO> {
    const [rawItems, total] = await this.prisma.$transaction([
      this.prisma.discardedReservation.findMany({
        orderBy: { createdAt: 'desc' },
        skip: skip * take,
        take,
      }),
      this.prisma.discardedReservation.count(),
    ]);

    const items = rawItems.map((item) =>
      DiscardedReservationPrismaMapper.toDiscardedReservationVO(item),
    );

    return DiscardedReservationListVO.create({ items, total });
  }
}
