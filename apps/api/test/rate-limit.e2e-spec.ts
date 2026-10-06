import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

describe('Rate limit', () => {
  let app: INestApplication;
  const original = { ...process.env };

  beforeAll(async () => {
    // Liga o limite (os demais testes rodam com ele desligado) e usa uma janela pequena.
    process.env.THROTTLE_DISABLED = 'false';
    process.env.THROTTLE_LIMIT = '5';
    process.env.THROTTLE_TTL_SECONDS = '60';
    // Import dinâmico: o ConfigModule lê o ambiente quando o AppModule é carregado.
    const { createTestApp } = await import('./helpers/app.js');
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
    process.env = original;
  });

  it('responde 429 no formato padrão depois de passar do limite', async () => {
    const statuses: number[] = [];
    let last: request.Response | undefined;
    for (let i = 0; i < 8; i++) {
      last = await request(app.getHttpServer()).get('/api/v1/skills');
      statuses.push(last.status);
    }

    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses.slice(5)).toEqual([429, 429, 429]);
    expect(last?.body).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: 'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.',
      },
    });
  });

  it('não limita o health check usado pela hospedagem', async () => {
    for (let i = 0; i < 12; i++) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
  });
});
