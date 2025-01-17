import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { RedisIoAdapter } from './adapters/redis-io.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { config } from './config/config';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appConfig = config().app;
  const configService = app.get(ConfigService);
  process.env.JWKS_URI = configService.get('JWKS_URI');
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.useWebSocketAdapter(new RedisIoAdapter(app));
  await app
    .listen(appConfig.port)
    .then(() => console.log(`App is running on ${appConfig.port}`));
}
bootstrap();
