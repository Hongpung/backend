export type SessionLogRollbackRpcRequest = {
  runtimeSessionId: string;
};

export type SessionLogRollbackRpcResponse = {
  deleted: boolean;
};
