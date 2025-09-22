import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import {
  MemberClubId,
  SessionLogRepositoryPort,
} from '../../../application/ports/out/session-log.repository.port';
import type {
  AdminSessionCalendarDayReadModel,
  AdminSessionLogDetailReadModel,
} from '../../../domain/read-models/admin-session-log.read-model';
import type {
  SessionLogDetailReadModel,
  SessionLogListItemReadModel,
} from '../../../domain/read-models/session-log.read-model';
import {
  SESSION_DETAIL_FIND_ARGS,
  SessionLogPrismaMapper,
} from './mappers/session-log.prisma.mapper';

@Injectable()
export class SessionLogPrismaRepository implements SessionLogRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findUserMonthlyAttendances(
    memberId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<SessionLogListItemReadModel[]> {
    const attendances = await this.prisma.attendance.findMany({
      where: {
        memberId,
        session: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        session: {
          include: {
            creator: true,
            _count: { select: { attendanceList: true } },
          },
        },
      },
    });

    return attendances.map(
      SessionLogPrismaMapper.toSessionLogListItemFromAttendance,
    );
  }

  async findMemberClubId(memberId: number): Promise<MemberClubId | null> {
    const member = await this.prisma.member.findUnique({
      where: { memberId },
      select: { clubId: true },
    });

    if (!member) return null;

    return SessionLogPrismaMapper.toMemberClubId(member);
  }

  async findClubMonthlySessions(
    clubId: number,
    reservationType: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SessionLogListItemReadModel[]> {
    const reservationTypeFilter =
      SessionLogPrismaMapper.parseReservationTypeFilter(reservationType);

    const sessions = await this.prisma.session.findMany({
      where: {
        creator: { clubId },
        ...(reservationTypeFilter
          ? { reservationType: reservationTypeFilter }
          : {}),
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
      include: {
        creator: true,
        _count: { select: { attendanceList: true } },
      },
    });

    return sessions.map(SessionLogPrismaMapper.toSessionLogListItemFromSession);
  }

  async findSessionBySessionId(
    sessionId: number,
  ): Promise<SessionLogDetailReadModel | null> {
    const session = await this.prisma.session.findUnique({
      where: { sessionId },
      ...SESSION_DETAIL_FIND_ARGS,
    });

    if (!session) return null;

    return SessionLogPrismaMapper.toSessionLogDetailReadModel(session);
  }

  async findSessionByReservationId(
    reservationId: number,
  ): Promise<SessionLogDetailReadModel | null> {
    const session = await this.prisma.session.findUnique({
      where: { reservationId },
      ...SESSION_DETAIL_FIND_ARGS,
    });

    if (!session) return null;

    return SessionLogPrismaMapper.toSessionLogDetailReadModel(session);
  }

  async findLatestSessions(
    skip: number,
    take: number,
  ): Promise<AdminSessionLogDetailReadModel[]> {
    const sessions = await this.prisma.session.findMany({
      ...SESSION_DETAIL_FIND_ARGS,
      orderBy: { sessionId: 'desc' },
      skip,
      take,
    });

    return sessions.map(
      SessionLogPrismaMapper.toAdminSessionLogDetailReadModel,
    );
  }

  async findAdminSessionCalendarForMonth(
    year: number,
    month: number,
  ): Promise<AdminSessionCalendarDayReadModel[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const grouped = await this.prisma.session.groupBy({
      by: ['date'],
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: { _all: true },
    });

    return grouped
      .map(SessionLogPrismaMapper.toAdminSessionCalendarDayReadModel)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async findAdminSessionLogsByDate(
    date: Date,
  ): Promise<AdminSessionLogDetailReadModel[]> {
    const sessions = await this.prisma.session.findMany({
      where: { date },
      orderBy: { startTime: 'asc' },
      ...SESSION_DETAIL_FIND_ARGS,
    });

    return sessions.map(
      SessionLogPrismaMapper.toAdminSessionLogDetailReadModel,
    );
  }
}
