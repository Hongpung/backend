import type {
  RegisterLiveActivityInput,
  UpdateLiveActivityInput,
} from '../../live-activity.model';

export const LiveActivityUseCasePort = Symbol('LiveActivityUseCasePort');

export interface LiveActivityUseCasePort {
  registerLiveActivity(
    memberId: number,
    input: RegisterLiveActivityInput,
  ): Promise<void>;
  updateLiveActivity(
    memberId: number,
    input: UpdateLiveActivityInput,
  ): Promise<void>;
  endLiveActivity(memberId: number, sessionId: number): Promise<void>;
  getActiveLiveActivities(memberId: number): Promise<Array<number | string>>;
}
