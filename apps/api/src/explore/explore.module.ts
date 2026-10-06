import { Module } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';

@Module({
  imports: [MatchingModule],
  controllers: [ExploreController],
  providers: [ExploreService],
  exports: [ExploreService],
})
export class ExploreModule {}
