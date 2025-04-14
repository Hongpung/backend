import { Injectable, UseGuards } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { OnEvent } from '@nestjs/event-emitter';
import { WsAuthGuard } from 'src/guards/ws-auth.guard';
import { SessionManagerService } from './session-manager.service';

@Injectable()
@WebSocketGateway({ namespace: '/reservation', cors: { origin: '*' } })
@UseGuards(WsAuthGuard) // Guard 적용
export class SessionListGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly sessionManager: SessionManagerService
  ) { }

  async afterInit() {
  }

  async handleConnection() {
    const currentReservation = this.sessionManager.getSessionListStatus();
    this.server.emit('reservationsFetched', JSON.stringify(currentReservation));
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @OnEvent('start-reservation-session') 
  @OnEvent('sessionUpdate')
  @OnEvent('end-session')
  @OnEvent('force-end-session')
  @OnEvent('restore-session-list')
  @OnEvent('session-list-changed')
  async fetchNewSessions() {
    const currentReservation = this.sessionManager.getSessionListStatus()
    this.server.emit('reservationsFetched', JSON.stringify(currentReservation));
  }
  
  
  @OnEvent('reservations.updated') // 이벤트 구독
  handleReservationsUpdate(updatedReservations: any[]) {
  }

  @SubscribeMessage('fetchReservations')
  async handleFetchReservations(client: Socket): Promise<any> {
    const currentReservation = this.sessionManager.getSessionListStatus()
    client.emit('reservations', JSON.stringify(currentReservation));
  }

}
