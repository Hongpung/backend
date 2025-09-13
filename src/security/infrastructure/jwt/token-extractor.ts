import { Request } from 'express';
import { Socket } from 'socket.io';

/**
 * HTTP/WebSocket에서 Bearer 토큰 추출.
 * Infrastructure 계층 - HTTP/WS 프로토콜 의존.
 */
function firstHeaderValue(value: string | string[] | undefined): string | null {
  if (value == null) return null;
  const s = Array.isArray(value) ? value[0] : value;
  if (typeof s !== 'string') return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
}

export const TokenExtractor = {
  fromHttpRequest(request: Request): string | null {
    const header = firstHeaderValue(request.headers['authorization']);
    if (!header) return null;

    const parts = header.split(/\s+/);
    if (parts.length < 2) return null;

    const scheme = parts[0];
    const token = parts.slice(1).join(' ').trim();
    if (scheme.toLowerCase() !== 'bearer' || token.length === 0) {
      return null;
    }
    return token;
  },

  fromWebSocket(client: Socket): string | null {
    return client.handshake.auth?.token ?? null;
  },
};
