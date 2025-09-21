import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';

export const ReservationRepositoryPort = Symbol('ReservationRepositoryPort');

export type ReservationTransaction = unknown;
export type TransactionClient = ReservationTransaction;

export interface OccupiedTimeReadModel {
  reservationId: number;
  title: string;
  reservationType: string;
  startTime: Date;
  endTime: Date;
  creator: { name: string } | null;
  externalCreatorName: string | null;
}

export interface ReservationRepository {
  findTodayReservationsByMemberId(
    memberId: number,
    date: Date,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity[]>;

  findNextReservationsByMemberId(
    memberId: number,
    startDate: Date,
    skip: number,
    take: number,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity[]>;

  findReservationsByTerm(
    startDate: Date,
    endDate: Date,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity[]>;

  findReservationsByMonth(
    startDate: Date,
    endDate: Date,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity[]>;

  findReservationsByDate(
    date: Date,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity[]>;

  findOccupiedTimesByDate(
    date: Date,
    tx?: ReservationTransaction,
  ): Promise<OccupiedTimeReadModel[]>;

  findReservationDetail(
    reservationId: number,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity | null>;

  findReservationById(
    reservationId: number,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity | null>;

  findReservationsByIds(
    reservationIds: number[],
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity[]>;

  findReservationsForSchedulerByDate(
    date: Date,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity[]>;

  save(
    reservation: ReservationEntity,
    tx?: ReservationTransaction,
  ): Promise<ReservationEntity>;

  delete(reservationId: number, tx?: ReservationTransaction): Promise<void>;

  deleteReservationsByIds(
    reservationIds: number[],
    tx?: ReservationTransaction,
  ): Promise<{ count: number }>;

  // Backward-compatible bulk delete shape used by existing handlers.
  deleteManyReservations(
    where: { reservationId: { in: number[] } },
    tx?: ReservationTransaction,
  ): Promise<{ count: number }>;

  findConflictReservations(
    options: {
      date: string;
      startTime: string;
      endTime: string;
      notIncludeId?: number;
    },
    tx?: ReservationTransaction,
  ): Promise<{ reservationId: number }[]>;

  someConflictReservation(
    options: {
      date: string;
      startTime: string;
      endTime: string;
      notIncludeId?: number;
    },
    tx?: ReservationTransaction,
  ): Promise<boolean>;

  transaction<T>(
    callback: (tx: ReservationTransaction) => Promise<T>,
  ): Promise<T>;
}

export type IReservationRepository = ReservationRepository;
