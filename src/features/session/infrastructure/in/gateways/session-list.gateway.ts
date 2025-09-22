import { Injectable, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_TOKEN } from 'src/contracts/events/event.constant';
import { SessionListWsAuthGuard } from 'src/security/presentation/guards/session-list-ws-auth.guard';
import { SessionRuntimeManager } from 'src/features/session/application/runtime/session-runtime.manager';
import { SESSION_LIST_WS_EVENT } from './session-list-event.constant';
import { SessionWebSocketMapper } from './mappers/session-ws-session.mapper';

@Injectable()
@WebSocketGateway({ namespace: '/reservation', cors: { origin: '*' } })
@UseGuards(SessionListWsAuthGuard) // Guard 적용
export class SessionListGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  constructor(private readonly sessionRuntimeManager: SessionRuntimeManager) {}

  async afterInit() {}

  async handleConnection() {
    const currentReservation = this.sessionRuntimeManager
      .getSessionListStatus()
      .map((session) => SessionWebSocketMapper.toPayload(session));
    this.server.emit(
      SESSION_LIST_WS_EVENT.RESERVATIONS_FETCHED,
      JSON.stringify(currentReservation),
    );
  }

  handleDisconnect() {}

  @OnEvent(EVENT_TOKEN.START_RESERVATION_SESSION)
  @OnEvent(EVENT_TOKEN.SESSION_UPDATE)
  @OnEvent(EVENT_TOKEN.END_SESSION)
  @OnEvent(EVENT_TOKEN.FORCE_END_SESSION)
  @OnEvent(EVENT_TOKEN.RESTORE_SESSION_LIST)
  @OnEvent(EVENT_TOKEN.SESSION_LIST_CHANGED)
  async fetchNewSessions() {
    const currentReservation = this.sessionRuntimeManager
      .getSessionListStatus()
      .map((session) => SessionWebSocketMapper.toPayload(session));
    this.server.emit(
      SESSION_LIST_WS_EVENT.RESERVATIONS_FETCHED,
      JSON.stringify(currentReservation),
    );
  }

  @OnEvent(EVENT_TOKEN.RESERVATIONS_UPDATED) // 이벤트 구독
  handleReservationsUpdate() {}

  @SubscribeMessage(SESSION_LIST_WS_EVENT.FETCH_RESERVATIONS)
  async handleFetchReservations(client: Socket): Promise<any> {
    const currentReservation = this.sessionRuntimeManager
      .getSessionListStatus()
      .map((session) => SessionWebSocketMapper.toPayload(session));
    client.emit(
      SESSION_LIST_WS_EVENT.RESERVATIONS,
      JSON.stringify(currentReservation),
    );
  }
}
