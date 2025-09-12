export const APP_DEEP_LINK_ORIGIN = 'https://app.hongpung.com';

export const DEEP_LINK_PATH = {
  CHECK_IN: '/check-in',
  QR_ALIAS: '/qr',
  SESSION_ACTIVE: '/session/active',
} as const;

export const DEEP_LINK_PATH_PREFIX = {
  RESERVATION: '/reservation/',
  NOTICE: '/notice/',
  SESSION_LOG: '/session-log/',
} as const;

export type PushNotificationDeepLinkData = {
  url: string;
};

export function buildAppDeepLink(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${APP_DEEP_LINK_ORIGIN}${normalized}`;
}

export function buildReservationDeepLink(reservationId: number): string {
  return buildAppDeepLink(
    `${DEEP_LINK_PATH_PREFIX.RESERVATION}${reservationId}`,
  );
}

export function buildNoticeDeepLink(noticeId: number): string {
  return buildAppDeepLink(`${DEEP_LINK_PATH_PREFIX.NOTICE}${noticeId}`);
}

export function buildSessionLogDeepLink(sessionLogId: number): string {
  return buildAppDeepLink(
    `${DEEP_LINK_PATH_PREFIX.SESSION_LOG}${sessionLogId}`,
  );
}

export function pushNotificationDataWithUrl(
  url: string,
): PushNotificationDeepLinkData {
  return { url };
}
