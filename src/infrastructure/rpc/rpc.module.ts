import { Global, Module } from '@nestjs/common';
import { InProcessRpcBus } from './in-process-rpc.bus';
import { RpcBusPort } from './rpc-bus.port';

@Global()
@Module({
  providers: [
    InProcessRpcBus,
    {
      provide: RpcBusPort,
      useExisting: InProcessRpcBus,
    },
  ],
  exports: [RpcBusPort, InProcessRpcBus],
})
export class RpcModule {}
