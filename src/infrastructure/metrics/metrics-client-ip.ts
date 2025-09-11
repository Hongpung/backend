import type { Request } from 'express';

/**
 * Express `req.ip` 또는 소켓 주소. `::ffff:x.x.x.x`는 IPv4로 축약.
 * 리버스 프록시 뒤에서는 `app.set('trust proxy', …)`가 있어야 `req.ip`가 실제 클라이언트를 반영한다.
 */
export function getMetricsClientIp(req: Request): string {
  const raw =
    (typeof req.ip === 'string' && req.ip.length > 0
      ? req.ip
      : req.socket?.remoteAddress) ?? '';
  if (raw.startsWith('::ffff:')) {
    return raw.slice('::ffff:'.length);
  }
  return raw;
}
