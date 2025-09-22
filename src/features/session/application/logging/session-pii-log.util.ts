import type { SessionLogDetailReadModel } from '../../domain/read-models/session-log-detail.read-model';
import type { EndSessionResultVo } from '../../domain/value-objects/end-session-result.vo';
import type { SessionEntity } from '../ports/out/session-snapshot-store.port';

export function maskEmail(email: string | null | undefined): string | undefined {
  if (!email) {
    return undefined;
  }
  const at = email.indexOf('@');
  if (at <= 0) {
    return '***';
  }
  return `${email[0]}***${email.slice(at)}`;
}

export function maskPersonalName(
  name: string | null | undefined,
): string | undefined {
  if (!name) {
    return undefined;
  }
  if (name.length <= 1) {
    return '*';
  }
  return `${name[0]}***`;
}

export function maskEnrollmentNumber(
  value: string | null | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value.length <= 2) {
    return '**';
  }
  return `****${value.slice(-2)}`;
}

export function maskUrlForLog(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url);
    return `${parsed.origin}/***`;
  } catch {
    return '***';
  }
}

export function maskSessionLogDetailForLog(
  detail: SessionLogDetailReadModel,
): Record<string, unknown> {
  return {
    sessionId: detail.sessionId,
    creatorId: detail.creatorId,
    creatorName: maskPersonalName(detail.creatorName),
    creatorNickname: maskPersonalName(detail.creatorNickname),
    title: detail.title,
    date: detail.date,
    startTime: detail.startTime,
    endTime: detail.endTime,
    sessionType: detail.sessionType,
    reservationType: detail.reservationType,
    participationAvailable: detail.participationAvailable,
    forceEnd: detail.forceEnd,
    extendCount: detail.extendCount,
    returnImageUrlCount: Array.isArray(detail.returnImageUrl)
      ? detail.returnImageUrl.length
      : detail.returnImageUrl
        ? 1
        : 0,
    reservationId: detail.reservationId,
    attendanceCount: detail.attendanceList.length,
    attendanceList: detail.attendanceList.map((row) => ({
      memberId: row.member.memberId,
      status: row.status,
      timeStamp: row.timeStamp,
    })),
    borrowInstrumentsCount: detail.borrowInstruments.length,
  };
}

export function maskEndSessionResultForLog(
  result: EndSessionResultVo,
): Record<string, unknown> {
  if (result.message === 'FAIL') {
    return {
      message: result.message,
      reason: result.reason,
      endBlockedReason: result.endBlockedReason,
    };
  }

  return {
    message: result.message,
    forceEnd: result.forceEnd,
    runtimeSessionId: result.endedSession.sessionId,
    sessionType: result.endedSession.sessionType,
    status: result.endedSession.status,
    title: result.endedSession.title,
    creatorId: result.endedSession.creatorId,
    returnImageUrlCount: result.returnImageUrls.length,
    sessionLogDetail: result.sessionLogDetail
      ? maskSessionLogDetailForLog(result.sessionLogDetail)
      : undefined,
  };
}

export function maskSessionListForLog(
  sessions: SessionEntity[],
): Record<string, unknown> {
  return {
    count: sessions.length,
    sessions: sessions.map((session) => ({
      sessionId: session.sessionId,
      sessionType: session.sessionType,
      status: session.status,
      title: session.title,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      creatorId: session.creatorId,
      attendanceCount: session.attendanceList?.length ?? 0,
    })),
  };
}
