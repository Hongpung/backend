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
import { OnairSessionUseStateWsPresenter } from './onair.presenter';
import { ONAIR_CLIENT_WS_EVENT, WS_EVENT } from './onair-event.constant';

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

  async handleConnection(client: Socket) {
    this.emitToClient(client, WS_EVENT.CURRENT_SESSION);
  }

  async handleDisconnect() {}

  private getCurrentSessionReadModel() {
    return this.sessionRuntimeManager.getOnairSessionUseStateReadModel();
  }

  private getCurrentSessionPayloadJson(
    readModel = this.getCurrentSessionReadModel(),
  ) {
    return OnairSessionUseStateWsPresenter.toJson(readModel);
  }

  private emitToAll(
    event: string,
    payloadJson = this.getCurrentSessionPayloadJson(),
  ) {
    this.server.emit(event, payloadJson);
  }

  private emitToClient(
    client: Socket,
    event: string,
    payloadJson = this.getCurrentSessionPayloadJson(),
  ) {
    client.emit(event, payloadJson);
  }

  private emitSessionUpdated(): void {
    const payloadJson = this.getCurrentSessionPayloadJson();

    this.emitToAll(WS_EVENT.FETCH_SESSION_UPDATE, payloadJson);
    this.emitToAll(WS_EVENT.SESSION_USE_STATE_UPDATED, payloadJson);
  }

  private emitSessionClosed(
    event:
      | (typeof WS_EVENT)['SESSION_ENDED']
      | (typeof WS_EVENT)['FORCE_ENDED'],
  ): void {
    const payloadJson = this.getCurrentSessionPayloadJson();

    this.emitToAll(WS_EVENT.SESSION_USE_STATE_UPDATED, payloadJson);
    this.server.emit(event);
    this.server.disconnectSockets();
  }

  @OnEvent(EVENT_TOKEN.END_SESSION)
  handleEndSession(payload: EndSessionEvent) {
    const forceEnd = payload.sessionSnapshot?.forceEnd === true;
    this.emitSessionClosed(
      forceEnd ? WS_EVENT.FORCE_ENDED : WS_EVENT.SESSION_ENDED,
    );
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

  @SubscribeMessage(ONAIR_CLIENT_WS_EVENT.FETCH_CURRENT_SESSION)
  fetchCurrentSession(client: Socket) {
    this.emitToClient(client, WS_EVENT.CURRENT_SESSION);
  }

  @SubscribeMessage(ONAIR_CLIENT_WS_EVENT.SESSION_USE_STATE)
  fetchSessionUseState(client: Socket) {
    this.emitToClient(client, WS_EVENT.SESSION_USE_STATE);
  }
}
