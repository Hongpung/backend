/**
 * @deprecated Use `DiscardedReservationPrismaMapper` from
 * `infrastructure/out/prisma/mappers/discarded-reservation.prisma.mapper.ts`.
 * Kept for cross-feature imports until reservation batch updates paths.
 */
export {
  DiscardedReservationPrismaMapper as DiscardedReservationPersistenceMapper,
  type DiscardedReservationRow,
  type ReservationRowForDiscardSnapshot,
} from '../prisma/mappers/discarded-reservation.prisma.mapper';
