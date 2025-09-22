import { Injectable, Logger } from '@nestjs/common';
import { Prisma, reservationType, sessionType } from '@prisma/client';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import type { PersistSessionLogCommand } from '../../../application/commands/persist-session-log.command';
import {
  SessionLogCommandRepositoryPort,
} from '../../../application/ports/out/session-log-command.repository.port';
import type { SessionLogDetailReadModel } from '../../../domain/read-models/session-log.read-model';
import {
  SESSION_DETAIL_FIND_ARGS,
  SessionLogPrismaMapper,
} from './mappers/session-log.prisma.mapper';

export class SessionLogPersistInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionLogPersistInvariantError';
  }
}

@Injectable()
export class SessionLogCommandPrismaRepository
  implements SessionLogCommandRepositoryPort
{
  private readonly logger = new Logger(SessionLogCommandPrismaRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async persistSessionFromSnapshot(
    payload: PersistSessionLogCommand,
  ): Promise<SessionLogDetailReadModel> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.findExistingByUniqueKeys(tx, payload);

      const sessionLogId = existing
        ? await this.applySnapshotToExistingSession(
            tx,
            payload,
            existing.sessionId,
          )
        : await this.insertSessionFromSnapshot(tx, payload);

      const detail = await this.loadSessionDetail(tx, sessionLogId);
      if (!detail) {
        throw new SessionLogPersistInvariantError(
          `Session log row missing after persist (sessionLogId=${sessionLogId})`,
        );
      }

      return detail;
    });
  }

  async deleteByRuntimeSessionId(runtimeSessionId: string): Promise<boolean> {
    const mapping = await this.prisma.sessionRuntimeMapping.findUnique({
      where: { runtimeSessionId },
      select: { sessionId: true },
    });
    if (!mapping) {
      return false;
    }

    await this.prisma.session.delete({
      where: { sessionId: mapping.sessionId },
    });
    return true;
  }

  private async insertSessionFromSnapshot(
    tx: Prisma.TransactionClient,
    payload: PersistSessionLogCommand,
  ): Promise<number> {
    try {
      const created = await tx.session.create({
        data: {
          ...this.buildSessionData(payload),
          runtimeMapping: {
            create: {
              runtimeSessionId: payload.runtimeSessionId,
            },
          },
        },
        select: { sessionId: true },
      });
      return created.sessionId;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const raced = await this.findExistingByUniqueKeys(tx, payload);
        if (raced) {
          return this.applySnapshotToExistingSession(
            tx,
            payload,
            raced.sessionId,
          );
        }
      }
      this.logger.error('Failed to insert session log from snapshot', error);
      throw error;
    }
  }

  private async applySnapshotToExistingSession(
    tx: Prisma.TransactionClient,
    payload: PersistSessionLogCommand,
    sessionLogId: number,
  ): Promise<number> {
    await tx.session.update({
      where: { sessionId: sessionLogId },
      data: {
        endTime: payload.endTime,
        extendCount: payload.extendCount,
        forceEnd: payload.forceEnd,
        ...(payload.returnImageUrl
          ? { returnImageUrl: payload.returnImageUrl }
          : {}),
      },
    });

    await this.syncAttendanceList(tx, sessionLogId, payload.attendanceList);
    return sessionLogId;
  }

  private async loadSessionDetail(
    tx: Prisma.TransactionClient,
    sessionLogId: number,
  ): Promise<SessionLogDetailReadModel | null> {
    const session = await tx.session.findUnique({
      where: { sessionId: sessionLogId },
      ...SESSION_DETAIL_FIND_ARGS,
    });

    if (!session) {
      return null;
    }

    return SessionLogPrismaMapper.toSessionLogDetailReadModel(session);
  }

  private async syncAttendanceList(
    tx: Prisma.TransactionClient,
    sessionLogId: number,
    attendanceList: PersistSessionLogCommand['attendanceList'],
  ): Promise<void> {
    const existingRows = await tx.attendance.findMany({
      where: { sessionId: sessionLogId },
      select: { attendanceId: true, memberId: true },
    });

    const snapshotMemberIds = new Set(
      attendanceList.map((att) => att.memberId),
    );

    for (const att of attendanceList) {
      const existing = existingRows.find((row) => row.memberId === att.memberId);
      if (existing) {
        await tx.attendance.update({
          where: { attendanceId: existing.attendanceId },
          data: {
            status: att.status,
            timeStamp: att.timeStamp,
          },
        });
      } else {
        await tx.attendance.create({
          data: {
            sessionId: sessionLogId,
            memberId: att.memberId,
            status: att.status,
            timeStamp: att.timeStamp,
          },
        });
      }
    }

    const attendanceIdsToRemove = existingRows
      .filter(
        (row) =>
          row.memberId != null && !snapshotMemberIds.has(row.memberId),
      )
      .map((row) => row.attendanceId);

    if (attendanceIdsToRemove.length > 0) {
      await tx.attendance.deleteMany({
        where: { attendanceId: { in: attendanceIdsToRemove } },
      });
    }
  }

  private buildSessionData(payload: PersistSessionLogCommand) {
    return {
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      creatorId: payload.creatorId,
      title: payload.title,
      sessionType: payload.sessionType as sessionType,
      reservationType:
        payload.reservationType === undefined ||
        payload.reservationType === null
          ? Prisma.skip
          : (payload.reservationType as reservationType),
      reservationId:
        payload.reservationId === undefined || payload.reservationId === null
          ? Prisma.skip
          : payload.reservationId,
      extendCount: payload.extendCount,
      participationAvailable: payload.participationAvailable,
      returnImageUrl: payload.returnImageUrl || Prisma.skip,
      forceEnd: payload.forceEnd,
      attendanceList: {
        create: payload.attendanceList.map((att) => ({
          memberId: att.memberId,
          status: att.status,
          timeStamp: att.timeStamp,
        })),
      },
      borrowInstruments: {
        create: payload.borrowInstruments.map((instrument) => ({
          instrumentId: instrument.instrumentId,
          instrumentSnapshot: instrument.instrumentSnapshot,
        })),
      },
    };
  }

  private async findExistingByUniqueKeys(
    tx: Prisma.TransactionClient,
    payload: PersistSessionLogCommand,
  ): Promise<{ sessionId: number } | null> {
    const byRuntime = await tx.sessionRuntimeMapping.findUnique({
      where: { runtimeSessionId: payload.runtimeSessionId },
      select: { sessionId: true },
    });
    if (byRuntime) {
      return { sessionId: byRuntime.sessionId };
    }

    if (payload.reservationId == null) {
      return null;
    }

    return tx.session.findUnique({
      where: { reservationId: payload.reservationId },
      select: { sessionId: true },
    });
  }
}
