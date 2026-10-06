import { Module } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [CreditsModule, SessionsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
