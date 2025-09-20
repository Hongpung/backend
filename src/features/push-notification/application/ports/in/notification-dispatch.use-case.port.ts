import type {
  SendAllNotificationEvent,
  SendNotificationEvent,
} from 'src/contracts/events/event.payload';

export const NotificationDispatchUseCasePort = Symbol(
  'NotificationDispatchUseCasePort',
);

/** 이벤트·비동기 경로에서 푸시 발송 요청을 큐에 적재한다. */
export interface NotificationDispatchUseCasePort {
  enqueueSendNotification(payload: SendNotificationEvent): Promise<void>;

  enqueueSendAllNotification(payload: SendAllNotificationEvent): Promise<void>;
}
