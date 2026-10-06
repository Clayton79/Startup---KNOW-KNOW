import { Body, Controller, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { replaceLearningSkillsSchema, type LearningSkillView } from '@know-know/shared';
import { createZodDto } from 'nestjs-zod';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequiredUser } from '../auth/decorators/current-user.decorator';
import { LearningService } from './learning.service';

class ReplaceLearningSkillsDto extends createZodDto(replaceLearningSkillsSchema) {}

@ApiTags('profiles')
@ApiBearerAuth()
@Controller('me/learning-skills')
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Put()
  @ApiOperation({ summary: 'Define o que eu quero aprender' })
  replace(
    @RequiredUser() user: AuthenticatedUser,
    @Body() body: ReplaceLearningSkillsDto,
  ): Promise<LearningSkillView[]> {
    return this.learning.replace(user.id, body);
  }
}
