import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppConfig } from './config/app-config.service';

export const API_PREFIX = 'api/v1';
/** Rotas fora do prefixo: usadas por infraestrutura e documentação. */
export const UNPREFIXED_ROUTES = ['health', 'health/ready'];

/**
 * Configuração compartilhada entre `main.ts` e os testes e2e, para que os testes
 * exercitem exatamente a mesma pilha de segurança de produção.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(AppConfig);
  const express = app as NestExpressApplication;

  // Atrás do proxy do Render: necessário para o rate limit enxergar o IP real do cliente.
  express.set('trust proxy', 1);
  express.useBodyParser('json', { limit: '100kb' });

  // O Swagger UI precisa de scripts inline; o restante da API usa a CSP restritiva padrão.
  const strictHelmet = helmet();
  const docsHelmet = helmet({ contentSecurityPolicy: false });
  app.use((req: { path: string }, res: unknown, next: () => void) => {
    const handler = req.path.startsWith('/docs') ? docsHelmet : strictHelmet;
    (handler as (req: unknown, res: unknown, next: () => void) => void)(req, res, next);
  });

  app.enableCors({
    origin: config.get('CORS_ALLOWED_ORIGINS'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  });

  app.setGlobalPrefix(API_PREFIX, { exclude: UNPREFIXED_ROUTES });
  app.enableShutdownHooks();
}

export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('KNOW-KNOW API')
      .setDescription('Troca de conhecimento que transforma. Autenticação via JWT do Supabase.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document));
}
