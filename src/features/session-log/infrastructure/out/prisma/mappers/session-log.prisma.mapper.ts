import type { Prisma } from '@prisma/client';
import { reservationType } from '@prisma/client';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { RoleEnum } from 'src/role/role.enum';
import type { EnRole } from 'src/role/role.type';
import type { MemberClubId } from '../../../../application/ports/out/session-log.repository.port';
import type {
  AdminSessionCalendarDayReadModel,
  AdminSessionLogAttendanceReadModel,
  AdminSessionLogBorrowInstrumentReadModel,
  AdminSessionLogDetailReadModel,
} from '../../../../domain/read-models/admin-session-log.read-model';
import type {
  SessionLogAttendanceReadModel,
  SessionLogBorrowInstrumentReadModel,
  SessionLogDetailReadModel,
  SessionLogListItemReadModel,
} from '../../../../domain/read-models/session-log.read-model';

export const SESSION_DETAIL_INCLUDE = {
  borrowInstruments: {
    include: {
      instrument: {
        select: {
          imageUrl: true,
          name: true,
          instrumentType: true,
          club: { select: { clubName: true } },
        },
      },
    },
  },
  attendanceList: {
    select: {
      member: {
        select: {
          memberId: true,
          name: true,
          nickname: true,
          blogUrl: true,
          club: { select: { clubName: true } },
          enrollmentNumber: true,
          profileImageUrl: true,
          instagramUrl: true,
          roleAssignment: { select: { role: true } },
        },
      },
      status: true,
      timeStamp: true,
    },
  },
  creator: { select: { name: true, nickname: true } },
} as const satisfies Prisma.SessionInclude;

/** 상세 조회: 1:N 관계를 JOIN으로 묶어 DB 왕복을 줄인다 (MySQL / Prisma 6). */
export const SESSION_DETAIL_FIND_ARGS = {
  include: SESSION_DETAIL_INCLUDE,
  relationLoadStrategy: 'join',
} as const satisfies Pick<
  Prisma.SessionFindManyArgs,
  'include' | 'relationLoadStrategy'
>;

export type SessionDetailRow = Prisma.SessionGetPayload<{
  include: typeof SESSION_DETAIL_INCLUDE;
}>;

const SESSION_LIST_INCLUDE = {
  creator: true,
  _count: { select: { attendanceList: true } },
} as const satisfies Prisma.SessionInclude;

type SessionSummaryRow = Prisma.SessionGetPayload<{
  include: typeof SESSION_LIST_INCLUDE;
}>;

type AttendanceWithSessionRow = Prisma.AttendanceGetPayload<{
  include: { session: { include: typeof SESSION_LIST_INCLUDE } };
}>;

type MemberClubIdRow = {
  clubId: number | null;
};

type AdminSessionCalendarGroupRow = {
  date: Date;
  _count: { _all: number };
};

type SessionListSource = {
  sessionId: number;
  creatorId: number | null;
  externalCreatorName: string | null;
  date: Date;
  startTime: Date;
  endTime: Date;
  sessionType: string;
  participationAvailable: boolean;
  forceEnd: boolean;
  reservationType: string | null;
  title: string;
  creator: { name: string; nickname: string | null } | null;
  _count: { attendanceList: number };
};

type BorrowInstrumentRow = SessionDetailRow['borrowInstruments'][number];

type InstrumentSnapshotShape = {
  name?: string;
  instrumentType?: string;
  imageUrl?: string | null;
  club?: string | { clubName?: string };
  clubName?: string;
};

export class SessionLogPrismaMapper {
  static toSessionLogListItemFromAttendance(
    attendance: AttendanceWithSessionRow,
  ): SessionLogListItemReadModel {
    return SessionLogPrismaMapper.toSessionLogListItemFromSession(
      attendance.session,
    );
  }

  static toSessionLogListItemFromSession(
    session: SessionSummaryRow,
  ): SessionLogListItemReadModel {
    return SessionLogPrismaMapper.formatSessionListItem(session);
  }

  static toSessionLogDetailReadModel(
    session: SessionDetailRow,
  ): SessionLogDetailReadModel {
    return {
      ...SessionLogPrismaMapper.formatSessionListItem(
        SessionLogPrismaMapper.withAttendanceCount(session),
      ),
      extendCount: session.extendCount,
      returnImageUrl: session.returnImageUrl,
      reservationId: session.reservationId,
      attendanceList: SessionLogPrismaMapper.mapAttendanceList(
        session.attendanceList,
      ),
      borrowInstruments: SessionLogPrismaMapper.mapBorrowInstruments(
        session.borrowInstruments,
      ),
    };
  }

  static toAdminSessionLogDetailReadModel(
    session: SessionDetailRow,
  ): AdminSessionLogDetailReadModel {
    const creator = SessionLogPrismaMapper.resolveCreatorDisplay(session);

    return {
      sessionId: session.sessionId,
      creatorId: session.creatorId,
      creatorName: creator.name,
      creatorNickname: creator.nickname,
      sessionType: session.sessionType,
      reservationType: session.reservationType,
      title: session.title,
      date: AppKstDateTime.kstCalendarYmdFromDbOrString(session.date),
      startTime: AppKstDateTime.timeFormmatForClient(session.startTime),
      endTime: AppKstDateTime.timeFormmatForClient(session.endTime),
      extendCount: session.extendCount,
      participationAvailable: session.participationAvailable,
      forceEnd: session.forceEnd,
      returnImageUrl: session.returnImageUrl,
      attendanceList: SessionLogPrismaMapper.mapAttendanceList(
        session.attendanceList,
      ) as AdminSessionLogAttendanceReadModel[],
      borrowInstruments: SessionLogPrismaMapper.mapBorrowInstruments(
        session.borrowInstruments,
      ) as AdminSessionLogBorrowInstrumentReadModel[],
    };
  }

  static toAdminSessionCalendarDayReadModel(
    row: AdminSessionCalendarGroupRow,
  ): AdminSessionCalendarDayReadModel {
    return {
      date: AppKstDateTime.kstCalendarYmdFromDbOrString(row.date),
      sessionCount: row._count._all,
    };
  }

  static toMemberClubId(member: MemberClubIdRow): MemberClubId {
    return {
      clubId: member.clubId,
    };
  }

  static parseReservationTypeFilter(
    value: string,
  ): reservationType | undefined {
    if (value in reservationType) {
      return reservationType[value as keyof typeof reservationType];
    }
    return undefined;
  }

  private static resolveCreatorDisplay(session: {
    creator: { name: string; nickname: string | null } | null;
    externalCreatorName: string | null;
  }): { name: string; nickname: string | null } {
    if (session.creator) {
      return {
        name: session.creator.name,
        nickname: session.creator.nickname,
      };
    }
    return {
      name: session.externalCreatorName ?? '알 수 없음',
      nickname: null,
    };
  }

  private static mapAttendanceList(
    attendanceList: SessionDetailRow['attendanceList'],
  ): SessionLogAttendanceReadModel[] {
    return attendanceList.map(
      ({
        member: { club, roleAssignment, ...restOfMember },
        status,
        timeStamp,
      }) => ({
        member: {
          ...restOfMember,
          club: club?.clubName,
          role: roleAssignment.map((roleAssign) =>
            RoleEnum.EnToKo(roleAssign.role as EnRole),
          ),
        },
        status,
        timeStamp: timeStamp ? AppKstDateTime.timeFormmatForClient(timeStamp) : null,
      }),
    );
  }

  private static mapBorrowInstruments(
    borrowInstruments: BorrowInstrumentRow[],
  ): SessionLogBorrowInstrumentReadModel[] {
    return borrowInstruments.map((row) =>
      SessionLogPrismaMapper.mapBorrowInstrument(row),
    );
  }

  private static mapBorrowInstrument(
    row: BorrowInstrumentRow,
  ): SessionLogBorrowInstrumentReadModel {
    const instrument = row.instrument;
    if (instrument) {
      return {
        imageUrl: instrument.imageUrl,
        name: instrument.name,
        instrumentType: instrument.instrumentType,
        club: instrument.club?.clubName,
      };
    }

    const snapshot = SessionLogPrismaMapper.parseInstrumentSnapshot(
      row.instrumentSnapshot,
    );
    if (snapshot) {
      return {
        imageUrl: snapshot.imageUrl ?? null,
        name: snapshot.name ?? '알 수 없음',
        instrumentType: snapshot.instrumentType ?? 'UNKNOWN',
        club: SessionLogPrismaMapper.clubNameFromSnapshot(snapshot),
      };
    }

    return {
      imageUrl: null,
      name: '알 수 없음',
      instrumentType: 'UNKNOWN',
    };
  }

  private static parseInstrumentSnapshot(
    json: Prisma.JsonValue,
  ): InstrumentSnapshotShape | null {
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return null;
    }
    return json as InstrumentSnapshotShape;
  }

  private static clubNameFromSnapshot(
    snap: InstrumentSnapshotShape,
  ): string | undefined {
    if (typeof snap.club === 'string') {
      return snap.club;
    }
    if (snap.club && typeof snap.club === 'object' && 'clubName' in snap.club) {
      return snap.club.clubName;
    }
    return snap.clubName;
  }

  private static withAttendanceCount(
    session: Omit<SessionListSource, '_count'> & {
      _count?: { attendanceList: number };
      attendanceList?: { length: number };
    },
  ): SessionListSource {
    const count =
      session._count?.attendanceList ?? session.attendanceList?.length ?? 0;
    return { ...session, _count: { attendanceList: count } };
  }

  private static formatSessionListItem(
    session: SessionListSource,
  ): SessionLogListItemReadModel {
    const creator = SessionLogPrismaMapper.resolveCreatorDisplay(session);

    return {
      sessionId: session.sessionId,
      creatorId: session.creatorId,
      creatorName: creator.name,
      creatorNickname: creator.nickname,
      title: session.title,
      date: AppKstDateTime.kstCalendarYmdFromDbOrString(session.date),
      startTime: AppKstDateTime.timeFormmatForClient(session.startTime),
      endTime: AppKstDateTime.timeFormmatForClient(session.endTime),
      sessionType: session.sessionType,
      reservationType: session.reservationType,
      participationAvailable: session.participationAvailable,
      forceEnd: session.forceEnd,
      attendeeCount: session._count.attendanceList,
    };
  }
}
