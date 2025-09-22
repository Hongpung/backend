import type {
  AttendSessionResultVo,
  CheckInSessionStateResultVo,
  StartSessionResultVo,
} from '../../../domain/value-objects/check-in-result.vo';

export const CheckInUseCasePort = Symbol('CheckInUseCasePort');

export interface CheckInUseCasePort {
  sessionStatus(userId: number): CheckInSessionStateResultVo;
  tryStartSession(
    memberId: number,
    participationAvailable?: boolean,
  ): Promise<StartSessionResultVo>;
  attendToSession(memberId: number): Promise<AttendSessionResultVo>;
}
