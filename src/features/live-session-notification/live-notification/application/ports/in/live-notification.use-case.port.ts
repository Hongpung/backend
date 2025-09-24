import type {
  RegisterLiveNotificationInput,
  SendLiveNotificationInput,
} from '../../live-notification.model';

export const LiveNotificationUseCasePort = Symbol(
  'LiveNotificationUseCasePort',
);

export interface LiveNotificationUseCasePort {
  registerLiveNotification(
    input: RegisterLiveNotificationInput,
    memberId: number,
  ): Promise<void>;
  sendLiveNotification(input: SendLiveNotificationInput): Promise<void>;
}
