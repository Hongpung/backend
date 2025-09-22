import { Injectable } from '@nestjs/common';
import { SessionRuntimeManager } from 'src/features/session/application/runtime/session-runtime.manager';

@Injectable()
export class SessionRuntimeBootstrap {
  constructor(private readonly sessionRuntimeManager: SessionRuntimeManager) {}

  async restore(): Promise<void> {
    await this.sessionRuntimeManager.restoreOnBootstrap();
  }
}
