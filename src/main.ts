import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // 종료 시 치지직 소켓을 정리하려면 OnApplicationShutdown 이 불려야 한다.
  app.enableShutdownHooks();

  const shutdown = () => {
    void app.close().then(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await app.listen(configService.get<number>('PORT') ?? 3000);
}
void bootstrap();
