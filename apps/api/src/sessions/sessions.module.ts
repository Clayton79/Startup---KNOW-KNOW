import { Module } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SessionsController } from './sessions.controller';
import { SessionsRepository } from './sessions.repository';
import { SessionsService } from './sessions.service';

@Module({
  imports: [CreditsModule, NotificationsModule],
  controllers: [SessionsController],
  providers: [SessionsRepository, SessionsService],
  exports: [SessionsService, SessionsRepository],
})
export class SessionsModule {}
