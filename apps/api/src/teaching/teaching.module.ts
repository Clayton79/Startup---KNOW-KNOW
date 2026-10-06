import { Module } from '@nestjs/common';
import { SkillsModule } from '../skills/skills.module';
import { TeachingController } from './teaching.controller';
import { TeachingService } from './teaching.service';

@Module({
  imports: [SkillsModule],
  controllers: [TeachingController],
  providers: [TeachingService],
})
export class TeachingModule {}
