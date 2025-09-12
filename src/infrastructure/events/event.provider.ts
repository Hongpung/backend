import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventPayloadMap } from 'src/contracts/events/event.map';

/**
 * Nest {@link EventEmitter2}에 타입만 입힌 래퍼.
 * `emitTyped`로 보낸 이벤트가 `@OnEvent` 구독자와 동일 버스를 쓰도록 인스턴스를 공유한다.
 */
@Injectable()
export class EventBus {
  constructor(private readonly emitter: EventEmitter2) {}

  emitTyped<K extends keyof EventPayloadMap>(
    event: K,
    ...args: EventPayloadMap[K] extends void ? [] : [EventPayloadMap[K]]
  ): boolean {
    return (
      args.length === 0
        ? this.emitter.emit(event as string)
        : this.emitter.emit(event as string, args[0])
    ) as boolean;
  }

  emitAsyncTyped<K extends keyof EventPayloadMap>(
    event: K,
    ...args: EventPayloadMap[K] extends void ? [] : [EventPayloadMap[K]]
  ): Promise<any[]> {
    return args.length === 0
      ? this.emitter.emitAsync(event as string)
      : this.emitter.emitAsync(event as string, args[0]);
  }

  onTyped<K extends keyof EventPayloadMap>(
    event: K,
    listener: EventPayloadMap[K] extends void
      ? () => void
      : (payload: EventPayloadMap[K]) => void,
  ) {
    return this.emitter.on(
      event as string,
      listener as (...a: unknown[]) => void,
    );
  }

  onceTyped<K extends keyof EventPayloadMap>(
    event: K,
    listener: EventPayloadMap[K] extends void
      ? () => void
      : (payload: EventPayloadMap[K]) => void,
  ) {
    return this.emitter.once(
      event as string,
      listener as (...a: unknown[]) => void,
    );
  }
}
