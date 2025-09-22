import type { SessionDailyReservationSyncPayload } from 'src/features/session/domain/read-models/session-daily-reservation-sync.read-model';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { InstrumentEnum } from 'src/features/instrument/models/instrument-enum';
import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';

function requireCreator(
  c: ReservationCreator | string,
): asserts c is ReservationCreator {
  if (typeof c === 'string') {
    throw new Error(
      'Daily reservation mapper requires Member creator; got external creator name',
    );
  }
}

export function mapReservationsToDailyItems(
  reservations: ReservationEntity[],
): SessionDailyReservationSyncPayload {
  return reservations.map((reservation) => {
    const dateStr = AppKstDateTime.kstCalendarYmdFromDbOrString(reservation.date);

    if (reservation.reservationType === 'EXTERNAL') {
      const creatorName = reservation.creator as string;
      return {
        reservationId: reservation.reservationId!,
        reservationType: reservation.reservationType,
        date: dateStr,
        startTime: AppKstDateTime.normalizeReservationTimeToHHmm(
          reservation.startTime,
        ),
        endTime: AppKstDateTime.normalizeReservationTimeToHHmm(
          reservation.endTime,
        ),
        title: reservation.title,
        participationAvailable: false,
        creatorName,
      };
    }

    const creator = reservation.creator;
    requireCreator(creator);

    return {
      reservationId: reservation.reservationId!,
      reservationType: reservation.reservationType,
      date: dateStr,
      startTime: AppKstDateTime.normalizeReservationTimeToHHmm(
        reservation.startTime,
      ),
      endTime: AppKstDateTime.normalizeReservationTimeToHHmm(
        reservation.endTime,
      ),
      title: reservation.title,
      participationAvailable: reservation.participationAvailable,
      creatorName: creator.name,
      creatorId: creator.memberId ?? null,
      creatorNickname: creator.nickname ?? null,
      participators: reservation.participators.map((member) => ({
        memberId: member.memberId,
        email: member.email,
        name: member.name,
        nickname: member.nickname ?? undefined,
        club: member.clubName ?? '',
        enrollmentNumber: member.enrollmentNumber,
        role: member.roles,
        profileImageUrl: member.profileImageUrl ?? undefined,
      })),
      borrowInstruments: reservation.borrowInstruments.map((instrument) => ({
        instrumentId: instrument.instrumentId,
        imageUrl: instrument.imageUrl ?? undefined,
        name: instrument.name,
        instrumentType: InstrumentEnum.EnToKo(instrument.instrumentType),
        club: instrument.getClubName(),
        borrowAvailable: instrument.isBorrowAvailable(),
      })),
    };
  });
}
