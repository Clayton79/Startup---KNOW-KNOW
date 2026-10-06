import type { INestApplication } from '@nestjs/common';
import type { SkillLevel } from '@know-know/shared';
import request from 'supertest';
import type { PrismaService } from '../../src/database/prisma.service';
import { bearer, mintToken } from './auth';

export interface TestUser {
  id: string;
  name: string;
  auth: { Authorization: string };
}

interface UserOptions {
  teach?: [slug: string, level?: SkillLevel][];
  learn?: string[];
  /** 'always' = todos os dias, 0h–24h (padrão). 'none' = sem horários. */
  availability?: 'always' | 'none' | { weekday: number; startMinute: number; endMinute: number }[];
  onboarded?: boolean;
  /** Define o saldo diretamente (padrão: 20 do bônus de boas-vindas). */
  balance?: number;
  mode?: 'ONLINE' | 'IN_PERSON' | 'BOTH';
  city?: string;
}

/** Monta usuários e aulas reais pela API, como o app faria. */
export class Scenario {
  constructor(
    readonly app: INestApplication,
    readonly prisma: PrismaService,
  ) {}

  http() {
    return request(this.app.getHttpServer());
  }

  async user(name: string, options: UserOptions = {}): Promise<TestUser> {
    const { token, sub } = await mintToken({ fullName: name });
    const user: TestUser = { id: sub, name, auth: bearer(token) };
    await this.http().get('/api/v1/me').set(user.auth).expect(200);

    if (options.mode || options.city) {
      await this.http()
        .patch('/api/v1/me')
        .set(user.auth)
        .send({
          ...(options.mode ? { preferredMode: options.mode } : {}),
          ...(options.city ? { city: options.city } : {}),
        })
        .expect(200);
    }

    if (options.teach?.length) {
      await this.http()
        .put('/api/v1/me/teaching-skills')
        .set(user.auth)
        .send({
          skills: await Promise.all(
            options.teach.map(async ([slug, level]) => ({
              skillId: await this.skillId(slug),
              level: level ?? 'ADVANCED',
            })),
          ),
        })
        .expect(200);
    }
    // O onboarding exige ao menos um conhecimento; quem não informou nada quer aprender matemática.
    const learn = options.learn ?? (options.teach?.length ? [] : ['matematica']);
    if (learn.length) {
      await this.http()
        .put('/api/v1/me/learning-skills')
        .set(user.auth)
        .send({
          skills: await Promise.all(
            learn.map(async (slug) => ({ skillId: await this.skillId(slug) })),
          ),
        })
        .expect(200);
    }

    const availability = options.availability ?? 'always';
    const rules =
      availability === 'always'
        ? [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startMinute: 0, endMinute: 1440 }))
        : availability === 'none'
          ? []
          : availability;
    if (rules.length > 0) {
      await this.http().put('/api/v1/me/availability').set(user.auth).send({ rules }).expect(200);
    }

    if (options.onboarded !== false) {
      await this.http().post('/api/v1/me/onboarding/complete').set(user.auth).expect(200);
    }
    if (options.balance !== undefined) {
      await this.prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: options.balance },
      });
    }
    return user;
  }

  async skillId(slug: string): Promise<string> {
    return (await this.prisma.skill.findUniqueOrThrow({ where: { slug } })).id;
  }

  /** Horário futuro "cheio" em São Paulo (UTC-3), `daysAhead` dias à frente. */
  slot(daysAhead = 3, hourLocal = 10): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + daysAhead);
    date.setUTCHours(hourLocal + 3, 0, 0, 0);
    return date.toISOString();
  }

  /** Solicita uma aula pela API (devolve a resposta para os testes inspecionarem). */
  async request(
    student: TestUser,
    mentor: TestUser,
    skillSlug: string,
    options: {
      daysAhead?: number;
      hour?: number;
      duration?: number;
      mode?: 'ONLINE' | 'IN_PERSON';
    } = {},
  ) {
    return this.http()
      .post('/api/v1/sessions')
      .set(student.auth)
      .send({
        mentorId: mentor.id,
        skillId: await this.skillId(skillSlug),
        startsAt: this.slot(options.daysAhead ?? 3, options.hour ?? 10),
        durationMinutes: options.duration ?? 60,
        mode: options.mode ?? 'ONLINE',
      });
  }

  /** Cria a solicitação e exige que tenha dado certo. */
  async requested(
    student: TestUser,
    mentor: TestUser,
    skillSlug: string,
    options: Parameters<Scenario['request']>[3] = {},
  ): Promise<string> {
    const res = await this.request(student, mentor, skillSlug, options);
    if (res.status !== 201)
      throw new Error(`Solicitação falhou: ${res.status} ${JSON.stringify(res.body)}`);
    return res.body.id as string;
  }

  async accept(mentor: TestUser, sessionId: string) {
    return this.http()
      .patch(`/api/v1/sessions/${sessionId}/accept`)
      .set(mentor.auth)
      .send({ meetingUrl: 'https://meet.google.com/abc-defg-hij' });
  }

  /** Solicita e aceita. */
  async accepted(
    student: TestUser,
    mentor: TestUser,
    skillSlug: string,
    options: Parameters<Scenario['request']>[3] = {},
  ): Promise<string> {
    const id = await this.requested(student, mentor, skillSlug, options);
    const res = await this.accept(mentor, id);
    if (res.status !== 200)
      throw new Error(`Aceite falhou: ${res.status} ${JSON.stringify(res.body)}`);
    return id;
  }

  /** Empurra a aula para o passado (simula o tempo passando, sem esperar). */
  async makePast(sessionId: string): Promise<void> {
    const now = Date.now();
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { startsAt: new Date(now - 2 * 3600_000), endsAt: new Date(now - 3600_000) },
    });
  }

  confirm(user: TestUser, sessionId: string, happened: boolean) {
    return this.http()
      .post(`/api/v1/sessions/${sessionId}/confirm`)
      .set(user.auth)
      .send({ happened });
  }

  /** Aula aceita, já terminada, esperando as confirmações. */
  async finished(student: TestUser, mentor: TestUser, skillSlug: string): Promise<string> {
    const id = await this.accepted(student, mentor, skillSlug);
    await this.makePast(id);
    return id;
  }

  /** Aula concluída pelos dois (créditos já transferidos). */
  async completed(student: TestUser, mentor: TestUser, skillSlug: string): Promise<string> {
    const id = await this.finished(student, mentor, skillSlug);
    await this.confirm(student, id, true).expect(200);
    await this.confirm(mentor, id, true).expect(200);
    return id;
  }

  async wallet(user: TestUser): Promise<{ balance: number; held: number; available: number }> {
    return (await this.http().get('/api/v1/wallet').set(user.auth).expect(200)).body;
  }
}
