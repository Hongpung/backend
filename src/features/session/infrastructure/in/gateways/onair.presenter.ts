import { OnairSessionUseStateReadModel } from 'src/features/session/domain/value-objects/onair-session-use-state.read-model';
import { SessionWirePayload } from '../../session-wire-payload.type';
import { toSessionBlockedReasonMessageKo } from 'src/features/session/domain/session-operation-reason.messages';
import { ReservationSession } from 'src/features/session/domain/entities/reservation-session.entity';
import { RealtimeSession } from 'src/features/session/domain/entities/realtime-session.entity';
import { SessionWebSocketMapper } from './mappers/session-ws-session.mapper';

export interface OnairSessionUseStateWsPayload {
  currentSession: SessionWirePayload | null;
  usageControl: {
    time: {
      remainingMsUntilEnd: number | null;
      elapsedMsSinceStart: number | null;
    };
    end: {
      available: boolean;
      blockedReason: string | null;
    };
    extend: {
      available: boolean;
      blockedReason: string | null;
    };
  };
}

export class OnairSessionUseStateWsPresenter {
  private static toPayload(
    readModel: OnairSessionUseStateReadModel,
  ): OnairSessionUseStateWsPayload {
    const currentSession =
      readModel.currentSession instanceof RealtimeSession ||
      readModel.currentSession instanceof ReservationSession
        ? SessionWebSocketMapper.toPayload(readModel.currentSession)
        : readModel.currentSession;

    return {
      currentSession,
      usageControl: {
        time: {
          remainingMsUntilEnd: readModel.remainingMsUntilEnd,
          elapsedMsSinceStart: readModel.elapsedMsSinceStart,
        },
        end: {
          available: readModel.canEnd,
          blockedReason: toSessionBlockedReasonMessageKo(
            readModel.endBlockedReason,
          ),
        },
        extend: {
          available: readModel.canExtend,
          blockedReason: toSessionBlockedReasonMessageKo(
            readModel.extendBlockedReason,
          ),
        },
      },
    };
  }

  static toJson(readModel: OnairSessionUseStateReadModel): string {
    return JSON.stringify(this.toPayload(readModel));
  }
}
