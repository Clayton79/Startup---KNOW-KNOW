import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';
import { AppConfig } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  setupSwagger(app);

  const config = app.get(AppConfig);
  // O Render injeta PORT; escutar em 0.0.0.0 é necessário em contêiner.
  await app.listen(config.get('PORT'), '0.0.0.0');
  new Logger('Bootstrap').log(
    `API no ar na porta ${config.get('PORT')} (${config.get('NODE_ENV')})`,
  );
}

void bootstrap();
