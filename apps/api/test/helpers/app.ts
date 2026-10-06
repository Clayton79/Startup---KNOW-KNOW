import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/database/prisma.service';
import { seedCatalog } from '../../prisma/catalog';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
}

/** Sobe a aplicação com a mesma configuração de segurança de produção. */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Esvazia todas as tabelas de dados (o catálogo é recriado por `seedCatalog`). */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE reports, notifications, review_scores, reviews, credit_transactions, wallets,
      sessions, availability_rules, user_learning_skills, user_teaching_skills, skills,
      skill_categories, profiles RESTART IDENTITY CASCADE`,
  );
  await seedCatalog(prisma);
}
