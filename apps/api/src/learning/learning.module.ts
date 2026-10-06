import { Module } from '@nestjs/common';
import { SkillsModule } from '../skills/skills.module';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';

@Module({
  imports: [SkillsModule],
  controllers: [LearningController],
  providers: [LearningService],
})
export class LearningModule {}
