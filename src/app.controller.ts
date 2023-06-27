import {
  CACHE_MANAGER,
  Controller,
  Get,
  Inject,
  Logger,
  Post,
  Request,
} from '@nestjs/common';
import { SocketGateway } from './socket/socket.gateway';
import { config } from './config/config';
import { Cache } from 'cache-manager';
@Controller('botMsg')
export class AppController {
  private logger: Logger = new Logger('AppController');
  public appConfig;
  constructor(
    private readonly wsg: SocketGateway,
    @Inject('CustomCacheToken') private cacheManager: Cache,
  ) {
    this.appConfig = config().app;
  }

  @Post('/adapterOutbound')
  async adapterOutbound(@Request() req) {
    try {
      this.logger.log(
        `Received Response from Adapter => ${JSON.stringify(req.body)}`,
      );
      const { message, to, messageId } = req.body;
      const clientId: string = await this.cacheManager.get(to);
      this.logger.log(`Sending message to: ${to} and clientID ${clientId}`);
      this.wsg.server
        .to(clientId)
        .emit('botResponse', { content: message, from: to, messageId });
      return { status: 'OK' };
    } catch (error) {
      this.logger.error('Error while emitting bot response', error);
    }
  }
}
