import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SessionsModule } from '../sessions/sessions.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [SessionsModule, NotificationsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
