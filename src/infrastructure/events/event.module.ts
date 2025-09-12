import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBus } from './event.provider';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [EventBus],
  exports: [EventBus],
})
export class EventModule {}
