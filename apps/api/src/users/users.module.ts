import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [ProfilesModule, AvailabilityModule, ReviewsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
