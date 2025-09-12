export class RpcTimeoutError extends Error {
  constructor(
    public readonly rpcKey: string,
    public readonly timeoutMs: number,
  ) {
    super(`RPC timeout: ${rpcKey} after ${timeoutMs}ms`);
    this.name = 'RpcTimeoutError';
  }
}
