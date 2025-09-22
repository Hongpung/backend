import type { EndSessionResultVo } from '../../../domain/value-objects/end-session-result.vo';
import type {
  IsCheckinResultVo,
  SessionOperationResultVo,
} from '../../../domain/value-objects/session-operation-result.vo';

export const SessionOperationsUseCasePort = Symbol(
  'SessionOperationsUseCasePort',
);

export interface SessionOperationsUseCasePort {
  isCheckinUser(userId: number): IsCheckinResultVo;
  isValidUser(userId: number): boolean;
  extendSession(
    userId: number,
    sessionId: string,
  ): Promise<SessionOperationResultVo>;
  endSession(
    userId: number,
    sessionId: string,
    returnImageUrls: string[],
  ): Promise<EndSessionResultVo>;
}
