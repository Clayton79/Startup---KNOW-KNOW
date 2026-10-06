import './common/zod/locale';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppConfig } from './config/app-config.service';
import { ConfigModule } from './config/config.module';
import { CreditsModule } from './credits/credits.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { ExploreModule } from './explore/explore.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SessionsModule } from './sessions/sessions.module';
import { WalletModule } from './wallet/wallet.module';
import { HealthModule } from './health/health.module';
import { LearningModule } from './learning/learning.module';
import { PlatformModule } from './platform/platform.module';
import { ProfilesModule } from './profiles/profiles.module';
import { SkillsModule } from './skills/skills.module';
import { StorageModule } from './storage/storage.module';
import { TeachingModule } from './teaching/teaching.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    StorageModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL_SECONDS') * 1000,
            limit: config.get('THROTTLE_LIMIT'),
          },
        ],
        skipIf: () => config.get('THROTTLE_DISABLED'),
      }),
    }),
    HealthModule,
    PlatformModule,
    CreditsModule,
    ProfilesModule,
    AuthModule,
    SkillsModule,
    TeachingModule,
    LearningModule,
    AvailabilityModule,
    UsersModule,
    ExploreModule,
    SessionsModule,
    WalletModule,
    NotificationsModule,
    ReviewsModule,
    DashboardModule,
    ReportsModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Ordem dos guards globais: 1) rate limit por IP, 2) autenticação (AuthModule), 3) papéis.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
