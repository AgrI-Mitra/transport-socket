import { CACHE_MANAGER, Inject, Logger, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Cache } from 'cache-manager';

import { AppService } from 'src/app.service';
import { config } from '../config/config';

import { WsGuard } from 'src/guard/ws.guard';

const appConfig = config().app;

@WebSocketGateway({
  timeout: appConfig.socket_timeout,
  pingTimeout: appConfig.socket_ping_timeout,
  pingInterval: appConfig.socket_ping_interval,
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger: Logger = new Logger('ApiGateway');

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly appService: AppService,
    @Inject('CustomCacheToken') private cacheManager: Cache,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Client initialize');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(
      `Client is connected with clientID ${client.id} and phoneNumber ${client.handshake.query.deviceId} and Client.id is`,
    );
    const sessionID = client.handshake.query.deviceId;
    const userID = client.handshake.query.deviceId as string;
    await this.cacheManager.set(userID, client.id, 86400 * 1000);
    client['sessionID'] = sessionID;
    client['userID'] = userID;
    client.join(userID);
    client.emit(appConfig.bot_session_event, {
      sessionID,
      userID,
      socketID: client.id,
    });
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client is disconnected = ${client.id}`);
    await this.cacheManager.set(client['userID'], null, 86400 * 1000);
  }

  // @UseGuards(WsGuard)
  @SubscribeMessage('botRequest')
  async handleMessage(client: Socket, { content, to, conversationId }: any) {
    this.logger.log(
      `Receiving chatbot request for ${to} with ${JSON.stringify(
        client.handshake.headers.userPhone,
      )}`,
    );
    // const userId = (client.handshake.headers.channel as string) + ":" + (client.handshake.headers.userPhone as string);
    // content.from = userId;
    this.appService.requestToAdapter({ content, to, conversationId }, this.server);
    return {};
  }

  @SubscribeMessage('endConnection')
  async handleEndConnection(client: Socket) {
    this.logger.log({ msg: 'The client has closed the bot' });
    await this.cacheManager.set(client['userID'], null, 86400 * 1000);
    client.disconnect(true);
    return {};
  }

  // load testing event
  @SubscribeMessage('client to server event')
  handleClientToServerMessage(
    client: Socket,
    message: any,
  ): WsResponse<string> {
    this.logger.log({ msg: `LoadTest: Sending response to client` });
    return { event: 'server to client event', data: 'response' };
  }
}
