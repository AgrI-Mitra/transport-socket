import { Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { jsonData } from '../test/chatResponses';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AppService {
  private logger: Logger = new Logger('AppService');

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async requestToAdapter(req, socket) {
    if (this.configService.get('ADAPTER_URL')) {
      this.sendRequestToAdapter(req);
    } else {
      this.getResponseFromLocal(req, socket);
    }
  }

  sendRequestToAdapter(req) {
    const adapterEndpoint = this.configService.get('ADAPTER_URL');
    try {
      const reqst = {
        conversationId: req.conversationId,
        body: req.content.text,
        media: req.content.media,
        userId: req.to,
        appId: req.content.appId,
        channel: req.content.channel,
        from: req.content.from,
        context: req.content.context,
        to: req.to,
        messageId: this.randomId(),
        identifier: req.content.identifier
      };
      const params = JSON.stringify(reqst);
      console.log('params',params)
      this.logger.log({ message: `Adapter Request => ${params}` });
      this.httpService
        .post(`${adapterEndpoint}/prompt`, params, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .subscribe(
          (res) => {
            this.logger.log({ message: `Request sent to UCI web Adapter` });
          },
          (err) => {
            this.logger.log({
              message: `Error while requesting UCI web Adapter => ${err}`,
            });
          },
        );
    } catch (error) {
      if (error) {
        this.logger.log({
          message: `Sending request to adapter failed => ${error.message}`,
        });
      }
    }
  }

  getResponseFromLocal(req, socket) {
    const content = req.content;
    let reply = jsonData['default'];
    if (jsonData[content.body]) {
      reply = jsonData[content.body];
    }
    const resData = {
      job: req,
      botResponse: reply,
    };
    socket.to(resData.job.to).emit('botResponse', {
      content: resData.botResponse,
      from: resData.job.to,
    });
  }

  randomId() {
    return uuid();
  }
}
