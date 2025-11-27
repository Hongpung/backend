/** v1 live Socket.IO event names (`socket-live.json`) */
export const LEGACY_ONAIR_WS_EVENT = {
  FETCH_CURRENT_SESSION: 'fetchCurrentSession',
  CURRENT_SESSION: 'currentSession',
  FETCH_SESSION_UPDATE: 'fetchSessionUpdate',
  SESSION_ENDED: 'sessionEnded',
  FORCE_ENDED: 'forceEnded',
} as const;

export const ONAIR_CLIENT_WS_EVENT = {
  FETCH_CURRENT_SESSION: 'current-session',
  SESSION_USE_STATE: 'session-use-state',
} as const;

export const WS_EVENT = {
  CURRENT_SESSION: 'current-session',
  SESSION_USE_STATE: 'session-use-state',
  SESSION_USE_STATE_UPDATED: 'session-use-state-updated',
  FETCH_SESSION_UPDATE: 'fetch-session-update',
  SESSION_ENDED: 'session-ended',
  FORCE_ENDED: 'force-ended',
} as const;
