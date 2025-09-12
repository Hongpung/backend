export const RPC_KEY = {
  SESSION_LOG_PERSIST: 'session-log.persist',
  SESSION_LOG_ROLLBACK: 'session-log.rollback',
} as const;

export type RpcKey = (typeof RPC_KEY)[keyof typeof RPC_KEY];
