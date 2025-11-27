import { Injectable, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import type { EndSessionEvent } from 'src/contracts/events/event.payload';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionRuntimeManager } from 'src/features/session/application/runtime/session-runtime.manager';
import { SessionControlWsAuthGuard } from 'src/security/presentation/guards/session-control-ws-auth.guard';
import { OnairSessionLegacyWsPresenter } from './onair-legacy.presenter';
import { OnairSessionUseStateWsPresenter } from './onair.presenter';
import {
  LEGACY_ONAIR_WS_EVENT,
  ONAIR_CLIENT_WS_EVENT,
  WS_EVENT,
} from './onair-event.constant';

@Injectable()
@WebSocketGateway({
  namespace: '/roomsession',
  cors: { origin: '*' },
})
@UseGuards(SessionControlWsAuthGuard)
export class OnairSessionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  constructor(private readonly sessionRuntimeManager: SessionRuntimeManager) {}

  async afterInit() {}

  /** v2 only: v1 clients poll via `fetchCurrentSession`. */
  async handleConnection(client: Socket) {
    this.emitV2ToClient(client, WS_EVENT.CURRENT_SESSION);
  }

  async handleDisconnect() {}

  private getCurrentSessionReadModel() {
    return this.sessionRuntimeManager.getOnairSessionUseStateReadModel();
  }

  private getV2PayloadJson(readModel = this.getCurrentSessionReadModel()) {
    return OnairSessionUseStateWsPresenter.toJson(readModel);
  }

  private getLegacyPayloadJson(readModel = this.getCurrentSessionReadModel()) {
    return OnairSessionLegacyWsPresenter.toJson(readModel);
  }

  private emitV2ToAll(
    event: string,
    payloadJson = this.getV2PayloadJson(),
  ): void {
    this.server.emit(event, payloadJson);
  }

  private emitV2ToClient(
    client: Socket,
    event: string,
    payloadJson = this.getV2PayloadJson(),
  ): void {
    client.emit(event, payloadJson);
  }

  private emitSessionUpdated(): void {
    const readModel = this.getCurrentSessionReadModel();
    const v2Json = this.getV2PayloadJson(readModel);
    const legacyJson = this.getLegacyPayloadJson(readModel);

    this.server.emit(LEGACY_ONAIR_WS_EVENT.FETCH_SESSION_UPDATE, legacyJson);
    this.emitV2ToAll(WS_EVENT.FETCH_SESSION_UPDATE, v2Json);
    this.emitV2ToAll(WS_EVENT.SESSION_USE_STATE_UPDATED, v2Json);
  }

  private emitSessionClosed(forceEnd: boolean): void {
    const v2Json = this.getV2PayloadJson();

    this.emitV2ToAll(WS_EVENT.SESSION_USE_STATE_UPDATED, v2Json);

    const legacyEndedEvent = forceEnd
      ? LEGACY_ONAIR_WS_EVENT.FORCE_ENDED
      : LEGACY_ONAIR_WS_EVENT.SESSION_ENDED;
    const v2EndedEvent = forceEnd
      ? WS_EVENT.FORCE_ENDED
      : WS_EVENT.SESSION_ENDED;

    this.server.emit(legacyEndedEvent);
    this.server.emit(v2EndedEvent);
    this.server.disconnectSockets();
  }

  @OnEvent(EVENT_TOKEN.END_SESSION)
  handleEndSession(payload: EndSessionEvent) {
    const forceEnd = payload.sessionSnapshot?.forceEnd === true;
    this.emitSessionClosed(forceEnd);
  }

  @OnEvent(EVENT_TOKEN.CREATE_SESSION)
  @OnEvent(EVENT_TOKEN.EXTEND_SESSION)
  @OnEvent(EVENT_TOKEN.SESSION_UPDATE)
  @OnEvent(EVENT_TOKEN.START_RESERVATION_SESSION)
  @OnEvent(EVENT_TOKEN.START_REALTIME_SESSION)
  @OnEvent(EVENT_TOKEN.START_SESSION)
  @OnEvent(EVENT_TOKEN.SESSION_LIST_CHANGED)
  async handleSessionUpdate() {
    this.emitSessionUpdated();
  }

  @SubscribeMessage(LEGACY_ONAIR_WS_EVENT.FETCH_CURRENT_SESSION)
  legacyFetchCurrentSession(client: Socket) {
    client.emit(
      LEGACY_ONAIR_WS_EVENT.CURRENT_SESSION,
      this.getLegacyPayloadJson(),
    );
  }

  @SubscribeMessage(ONAIR_CLIENT_WS_EVENT.FETCH_CURRENT_SESSION)
  fetchCurrentSession(client: Socket) {
    this.emitV2ToClient(client, WS_EVENT.CURRENT_SESSION);
  }

  @SubscribeMessage(ONAIR_CLIENT_WS_EVENT.SESSION_USE_STATE)
  fetchSessionUseState(client: Socket) {
    this.emitV2ToClient(client, WS_EVENT.SESSION_USE_STATE);
  }
}
