import { Injectable, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionOperationsService } from './session-operations.service';
import { SessionWsAuthGuard } from 'src/guards/session-ws-auth.guard';

@Injectable()
@WebSocketGateway({
    namespace: '/roomsession', // 네임스페이스 설정
    cors: { origin: '*' } // CORS 설정 필요 시 추가
})
@UseGuards(SessionWsAuthGuard) // Guard 적용
export class SessionGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

    @WebSocketServer()
    private server: Server;
    constructor(
        private readonly sessionOperations: SessionOperationsService
    ) { }

    async afterInit() {
    }

    async handleConnection(client: Socket) {
    }

    async handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @OnEvent('startSession')
    startSession() {
    }

    @OnEvent('end-session')
    handleEndSession() {
        this.server.emit('sessionEnded')
        this.server.disconnectSockets();
    }


    @OnEvent('create-session')
    @OnEvent('extend-session')
    @OnEvent('session-update')
    async handleSessionUpadate() {
        //세션이 업데이트 되면 새로운 세션을 적용 및 emit
        this.sessionOperations.emitOnChange(this.server)
    }


    @OnEvent('force-end-session')
    async handleForceEndSession() {
        this.server.emit('forceEnded')
        this.server.disconnectSockets()
    }


    @SubscribeMessage('fetchCurrentSession')
    fetchCurrentSession(client: Socket) {
        //client가 현재 세션 요청하면 전달
        this.sessionOperations.fetchCurrentSession(client)
    }

}
