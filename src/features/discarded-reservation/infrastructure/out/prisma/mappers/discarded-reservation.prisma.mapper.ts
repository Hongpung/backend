import {
  Club as PrismaClub,
  DiscardedReservation as PrismaDiscardedReservation,
  Instrument as PrismaInstrument,
  Member as PrismaMember,
  Reservation as PrismaReservation,
  RoleAssignment as PrismaRoleAssignment,
} from '@prisma/client';
import {
  DiscardedReservationSnapshot,
  DiscardedReservationVO,
  type DiscardedByType,
  type DiscardReason,
} from 'src/features/discarded-reservation/domain/discarded-reservation.vo';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

const DEFAULT_GRACE_MINUTES = 10;

interface MemberWithClub extends PrismaMember {
  club: PrismaClub | null;
  roleAssignment: PrismaRoleAssignment[];
}

interface InstrumentWithClub extends PrismaInstrument {
  club: PrismaClub | null;
}

export interface ReservationRowForDiscardSnapshot extends PrismaReservation {
  creator: MemberWithClub | null;
  participators: MemberWithClub[];
  borrowInstruments: InstrumentWithClub[];
}

export type DiscardedReservationRow = Pick<
  PrismaDiscardedReservation,
  | 'discardedReservationId'
  | 'reservationId'
  | 'discardedByType'
  | 'discardReason'
  | 'reservationSnapshot'
  | 'createdAt'
>;

export class DiscardedReservationPrismaMapper {
  static toReservationSnapshot(
    reservation: ReservationRowForDiscardSnapshot,
  ): DiscardedReservationSnapshot {
    const creatorSnapshot = reservation.creator
      ? this.toMemberSnapshot(reservation.creator)
      : null;

    return {
      reservationId: reservation.reservationId,
      date: AppKstDateTime.kstCalendarYmdFromDbOrString(reservation.date),
      startTime: AppKstDateTime.deserializeReservationTimeToHHmm(reservation.startTime),
      endTime: AppKstDateTime.deserializeReservationTimeToHHmm(reservation.endTime),
      title: reservation.title,
      reservationType: reservation.reservationType,
      participationAvailable: reservation.participationAvailable,
      creatorId: reservation.creatorId,
      externalCreatorName: reservation.externalCreatorName,
      creatorSnapshot,
      participators: reservation.participators.map((p) =>
        this.toMemberSnapshot(p),
      ),
      borrowInstruments: reservation.borrowInstruments.map((i) =>
        this.toInstrumentSnapshot(i),
      ),
      policy: {
        graceMinutes: DEFAULT_GRACE_MINUTES,
      },
    };
  }

  static toDiscardedReservationVO(
    row: DiscardedReservationRow,
  ): DiscardedReservationVO {
    return DiscardedReservationVO.create({
      discardedReservationId: row.discardedReservationId,
      reservationId: row.reservationId,
      discardedByType: row.discardedByType as DiscardedByType,
      discardReason: row.discardReason as DiscardReason,
      reservation: this.normalizeStoredSnapshot(row.reservationSnapshot),
      createdAt: row.createdAt,
    });
  }

  /**
   * DB JSON 스냅샷을 읽을 때 legacy ISO·HH:mm 혼재를 HH:mm·YMD로 맞춘다.
   */
  static normalizeStoredSnapshot(
    raw: PrismaDiscardedReservation['reservationSnapshot'],
  ): DiscardedReservationSnapshot {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {} as DiscardedReservationSnapshot;
    }

    const data = raw as Record<string, unknown>;
    const policyRaw = data.policy;

    return {
      ...(data as DiscardedReservationSnapshot),
      date:
        data.date != null
          ? AppKstDateTime.kstCalendarYmdFromDbOrString(data.date as string | Date)
          : (data.date as string),
      startTime:
        data.startTime != null
          ? AppKstDateTime.deserializeReservationTimeToHHmm(data.startTime as string | Date)
          : (data.startTime as string),
      endTime:
        data.endTime != null
          ? AppKstDateTime.deserializeReservationTimeToHHmm(data.endTime as string | Date)
          : (data.endTime as string),
      policy:
        policyRaw && typeof policyRaw === 'object' && !Array.isArray(policyRaw)
          ? {
              graceMinutes:
                (policyRaw as { graceMinutes?: number }).graceMinutes ??
                DEFAULT_GRACE_MINUTES,
            }
          : { graceMinutes: DEFAULT_GRACE_MINUTES },
    };
  }

  private static toMemberSnapshot(member: MemberWithClub) {
    return {
      memberId: member.memberId,
      name: member.name,
      nickname: member.nickname,
      email: member.email,
      enrollmentNumber: member.enrollmentNumber,
      club: member.club
        ? {
            clubId: member.club.clubId,
            clubName: member.club.clubName,
          }
        : null,
      roles: member.roleAssignment.map((ra) => ({
        roleAssignmentId: ra.roleAssignmentId,
        role: ra.role,
        clubId: ra.clubId,
      })),
    };
  }

  private static toInstrumentSnapshot(instrument: InstrumentWithClub) {
    return {
      instrumentId: instrument.instrumentId,
      name: instrument.name,
      imageUrl: instrument.imageUrl,
      instrumentType: instrument.instrumentType,
      borrowAvailable: instrument.borrowAvailable,
      club: instrument.club
        ? {
            clubId: instrument.club.clubId,
            clubName: instrument.club.clubName,
          }
        : null,
    };
  }
}
