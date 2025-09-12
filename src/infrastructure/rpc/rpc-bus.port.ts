export const RpcBusPort = Symbol('RpcBusPort');

export interface RpcBusPort {
  register<Request, Response>(
    key: string,
    handler: (payload: Request) => Promise<Response>,
  ): void;

  request<Request, Response>(
    key: string,
    payload: Request,
    options?: { timeoutMs?: number },
  ): Promise<Response>;
}
