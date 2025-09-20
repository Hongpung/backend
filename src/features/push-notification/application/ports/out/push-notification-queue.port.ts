import type {
  SendAllNotificationEvent,
  SendNotificationEvent,
} from 'src/contracts/events/event.payload';

export const PushNotificationQueuePort = Symbol('PushNotificationQueuePort');

export interface PushNotificationQueuePort {
  /** 지정 수신자(to) 대상 — jobId 고정 없이 각 요청마다 큐에 적재한다. */
  enqueueForRecipients(payload: SendNotificationEvent): Promise<void>;

  /** 전체 회원 대상 브로드캐스트 */
  enqueueForBroadcast(payload: SendAllNotificationEvent): Promise<void>;
}
