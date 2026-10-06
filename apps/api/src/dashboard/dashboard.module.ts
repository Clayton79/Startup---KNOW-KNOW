import { Module } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module';
import { ExploreModule } from '../explore/explore.module';
import { SessionsModule } from '../sessions/sessions.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [CreditsModule, ExploreModule, SessionsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
