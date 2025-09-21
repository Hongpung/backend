import { ReservationEntity } from 'src/features/reservation/domain/entities/reservation.entity';
import type { ReservationType } from 'src/features/reservation/reservation.types';
import { ReservationCreator } from 'src/features/reservation/domain/entities/reservation-creator.entity';
import { ReservationParticipator } from 'src/features/reservation/domain/entities/reservation-participator.entity';
import { ReservationBorrowInstrument } from 'src/features/reservation/domain/entities/reservation-borrow-instrument.entity';
import {
  Reservation as PrismaReservation,
  Member as PrismaMember,
  Instrument as PrismaInstrument,
  Club as PrismaClub,
  RoleAssignment as PrismaRoleAssignment,
} from '@prisma/client';
import type { EnInstrumentType } from 'src/features/instrument/models/instrument.model';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';

interface MemberWithClub extends PrismaMember {
  club: PrismaClub;
  roleAssignment: Array<PrismaRoleAssignment>;
}

interface InstrumentWithClub extends PrismaInstrument {
  club: PrismaClub;
}

interface ReservationWithRelations extends PrismaReservation {
  creator: MemberWithClub | null;
  participators: MemberWithClub[];
  borrowInstruments: InstrumentWithClub[];
}

export class ReservationPrismaMapper {
  static toEntity(prismaData: ReservationWithRelations): ReservationEntity {
    const participators = prismaData.participators.map((participator) =>
      ReservationParticipator.create({
        memberId: participator.memberId,
        name: participator.name,
        nickname: participator.nickname,
        email: participator.email,
        enrollmentNumber: participator.enrollmentNumber,
        profileImageUrl: participator.profileImageUrl,
        blogUrl: participator.blogUrl,
        instagramUrl: participator.instagramUrl,
        clubName:
          participator.club && 'clubName' in participator.club
            ? participator.club.clubName
            : (participator.club?.clubName ?? null),
        roles: participator.roleAssignment.map((ra) => ra.role),
      }),
    );

    const borrowInstruments = prismaData.borrowInstruments.map((instrument) =>
      ReservationBorrowInstrument.create({
        instrumentId: instrument.instrumentId,
        name: instrument.name,
        instrumentType: instrument.instrumentType as EnInstrumentType,
        imageUrl: instrument.imageUrl,
        borrowAvailable: instrument.borrowAvailable,
        clubName: instrument.club.clubName ?? '',
      }),
    );

    if (prismaData.reservationType === 'EXTERNAL') {
      const label =
        prismaData.externalCreatorName?.trim() ||
        prismaData.creator?.name?.trim();
      if (!label) {
        throw new Error(
          'EXTERNAL 예약에는 externalCreatorName 또는 연결된 creator 이름이 필요합니다.',
        );
      }
      return ReservationEntity.create({
        reservationId: prismaData.reservationId,
        date: prismaData.date,
        startTime: AppKstDateTime.timeFormmatForClient(prismaData.startTime),
        endTime: AppKstDateTime.timeFormmatForClient(prismaData.endTime),
        title: prismaData.title,
        reservationType: 'EXTERNAL',
        participationAvailable: prismaData.participationAvailable,
        creator: label,
        participators,
        borrowInstruments,
      });
    }

    if (!prismaData.creator) {
      throw new Error('REGULAR/COMMON 예약에는 creator(Member)가 필요합니다.');
    }

    const creator = ReservationCreator.create({
      memberId: prismaData.creator.memberId,
      name: prismaData.creator.name,
      nickname: prismaData.creator.nickname,
      email: prismaData.creator.email,
      enrollmentNumber: prismaData.creator.enrollmentNumber,
      profileImageUrl: prismaData.creator.profileImageUrl,
      blogUrl: prismaData.creator.blogUrl,
      instagramUrl: prismaData.creator.instagramUrl,
      clubName: prismaData.creator.club.clubName ?? null,
      roles: prismaData.creator.roleAssignment.map((ra) => ra.role),
    });

    return ReservationEntity.create({
      reservationId: prismaData.reservationId,
      date: prismaData.date,
      startTime: AppKstDateTime.timeFormmatForClient(prismaData.startTime),
      endTime: AppKstDateTime.timeFormmatForClient(prismaData.endTime),
      title: prismaData.title,
      reservationType: prismaData.reservationType as Exclude<
        ReservationType,
        'EXTERNAL'
      >,
      participationAvailable: prismaData.participationAvailable,
      creator,
      participators,
      borrowInstruments,
    });
  }
}
