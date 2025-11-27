import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import { MemberAuthDomainEventsPublisherAdapter } from './member-auth-domain-events.publisher.adapter';

describe('MemberAuthDomainEventsPublisherAdapter', () => {
  let eventBus: { emitAsyncTyped: jest.Mock };
  let adapter: MemberAuthDomainEventsPublisherAdapter;

  beforeEach(() => {
    eventBus = {
      emitAsyncTyped: jest.fn(async () => []),
    };
    adapter = new MemberAuthDomainEventsPublisherAdapter(eventBus as any);
  });

  it('MemberNewDeviceLoginPushNotification을 mapper로 변환해 SEND_NOTIFICATION을 발행한다', async () => {
    await adapter.publishNewDeviceLoginNotification({
      memberId: 1,
      deviceName: 'Pixel',
    });

    expect(eventBus.emitAsyncTyped).toHaveBeenCalledWith(
      EVENT_TOKEN.SEND_NOTIFICATION,
      {
        to: [1],
        title: '새 기기 로그인',
        body: 'Pixel에서 로그인되었습니다.',
      },
    );
  });
});
