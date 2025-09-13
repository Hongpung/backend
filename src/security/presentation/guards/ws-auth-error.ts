import type { Socket } from 'socket.io';

export const WS_AUTH_ERROR_EVENT = 'auth-error' as const;

export const WS_AUTH_ERROR_CODE = {
  TOKEN_MISSING: 'TOKEN_MISSING',
  TOKEN_INVALID: 'TOKEN_INVALID',
  USER_NOT_CHECKED_IN: 'USER_NOT_CHECKED_IN',
} as const;

export type WsAuthErrorCode =
  (typeof WS_AUTH_ERROR_CODE)[keyof typeof WS_AUTH_ERROR_CODE];

export interface WsAuthError {
  code: WsAuthErrorCode;
  message: string;
}

const WS_AUTH_ERROR_MESSAGE: Record<WsAuthErrorCode, string> = {
  TOKEN_MISSING: '인증 토큰이 없습니다.',
  TOKEN_INVALID: '인증 토큰이 유효하지 않습니다.',
  USER_NOT_CHECKED_IN: '출석하지 않은 사용자입니다.',
};

export function emitWsAuthError(
  client: Socket,
  code: WsAuthErrorCode,
): WsAuthError {
  const error: WsAuthError = {
    code,
    message: WS_AUTH_ERROR_MESSAGE[code],
  };

  client.emit(WS_AUTH_ERROR_EVENT, error);
  return error;
}
