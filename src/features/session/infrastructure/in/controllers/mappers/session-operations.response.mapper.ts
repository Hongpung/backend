import type {
  EndSessionResultVo,
  EndSessionSuccessResultVo,
} from '../../../../domain/value-objects/end-session-result.vo';
import { EndSessionLogDetailMapper } from './end-session-log-detail.mapper';
import {
  type IsCheckinResultVo,
  type SessionOperationFailureReason,
  type SessionOperationResultVo,
} from '../../../../domain/value-objects/session-operation-result.vo';
import type {
  EndSessionResDto,
  IsCheckinResDto,
  SessionOperationResultResDto,
} from '../dto/response';
import { resolveSessionFailReasonMessageKo } from '../../../../domain/session-operation-reason.messages';
import { SessionErrorCode } from '../dto/response/session-error.code';

export class SessionOperationsResponseMapper {
  static toIsCheckinResDto(result: IsCheckinResultVo): IsCheckinResDto {
    return {
      ...result,
      code: SessionErrorCode.SUCCESS_CHECKIN,
    };
  }

  static toExtendSessionResDto(
    result: SessionOperationResultVo,
  ): SessionOperationResultResDto {
    if (result.message === 'SUCCESS') {
      return {
        message: 'SUCCESS',
        code: SessionErrorCode.SUCCESS_EXTEND,
      };
    }

    return {
      message: 'FAIL',
      code: this.toFailCode(result.reason),
      reason: resolveSessionFailReasonMessageKo({
        failureReason: result.reason,
        blockedReason: result.extendBlockedReason,
      }),
    };
  }

  static toEndSessionResDto(result: EndSessionResultVo): EndSessionResDto {
    if (result.message === 'FAIL') {
      return {
        message: 'FAIL',
        code: this.toFailCode(result.reason),
        reason: resolveSessionFailReasonMessageKo({
          failureReason: result.reason,
          blockedReason: result.endBlockedReason,
        }),
      };
    }

    return {
      message: 'SUCCESS',
      code: SessionErrorCode.SUCCESS_END,
      endSessionData: this.toEndSessionLogDetail(result),
    };
  }

  private static toEndSessionLogDetail(result: EndSessionSuccessResultVo) {
    if (result.sessionLogDetail) {
      return result.sessionLogDetail;
    }

    return EndSessionLogDetailMapper.fromEndedSession({
      session: result.endedSession,
      sessionLogId: 0,
      returnImageUrls: result.returnImageUrls,
      forceEnd: result.forceEnd,
    });
  }

  private static toFailCode(reason: SessionOperationFailureReason): number {
    switch (reason) {
      case 'NOT_FOUND':
        return SessionErrorCode.FAIL_NOT_FOUND;
      case 'UNAUTHORIZED':
        return SessionErrorCode.FAIL_UNAUTHORIZED;
      case 'NOT_ALLOWED':
      default:
        return SessionErrorCode.FAIL_NOT_ALLOWED;
    }
  }
}
