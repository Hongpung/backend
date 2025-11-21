import { describe, expect, it } from '@jest/globals';
import {
  buildAppDeepLink,
  buildSessionLogDeepLink,
  DEEP_LINK_PATH,
} from 'src/contracts/deep-link/deep-link';
import { SESSION_PUSH_NOTIFICATION_KIND } from 'src/features/session/application/models/session-push-notification.model';
import { buildSessionMemberPushNotification } from './session-push-notification.mapper';

describe('session-push-notification.mapper', () => {
  it('FORCE_END는 세션 로그 상세 링크와 본문을 만든다', () => {
    const result = buildSessionMemberPushNotification({
      kind: SESSION_PUSH_NOTIFICATION_KIND.FORCE_END,
      memberIds: [9],
      sessionTitle: '연습 제목',
      sessionLogId: 42,
    });

    expect(result).toEqual({
      to: [9],
      title: '연습실 이용 안내',
      body: '연습 제목이 시간 제한에 의해 종료 되었습니다.\n다음부터는 시간을 준수해주세요.',
      data: { url: buildSessionLogDeepLink(42) },
    });
  });

  it('FORCE_END_ALARM은 긴 제목을 잘라 본문에 사용한다', () => {
    const result = buildSessionMemberPushNotification({
      kind: SESSION_PUSH_NOTIFICATION_KIND.FORCE_END_ALARM,
      memberIds: [1],
      sessionTitle: '아주 긴 연습 제목입니다',
    });

    expect(result?.body).toContain('10분 뒤 종료');
    expect(result?.body).toContain('아주 긴 연습 제목...');
    expect(result?.data).toEqual({
      url: buildAppDeepLink(DEEP_LINK_PATH.SESSION_ACTIVE),
    });
  });

  it('NO_SHOW_DISCARD는 체크인 링크를 담는다', () => {
    const result = buildSessionMemberPushNotification({
      kind: SESSION_PUSH_NOTIFICATION_KIND.NO_SHOW_DISCARD,
      memberIds: [2],
      sessionTitle: '연습',
    });

    expect(result?.data).toEqual({
      url: buildAppDeepLink(DEEP_LINK_PATH.CHECK_IN),
    });
  });

  it('수신자가 없으면 null을 반환한다', () => {
    expect(
      buildSessionMemberPushNotification({
        kind: SESSION_PUSH_NOTIFICATION_KIND.FORCE_END,
        memberIds: [],
        sessionTitle: '연습',
        sessionLogId: 1,
      }),
    ).toBeNull();
  });
});
