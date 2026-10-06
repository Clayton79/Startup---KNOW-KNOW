import { Body, Controller, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { replaceTeachingSkillsSchema, type TeachingSkillView } from '@know-know/shared';
import { createZodDto } from 'nestjs-zod';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequiredUser } from '../auth/decorators/current-user.decorator';
import { TeachingService } from './teaching.service';

class ReplaceTeachingSkillsDto extends createZodDto(replaceTeachingSkillsSchema) {}

@ApiTags('profiles')
@ApiBearerAuth()
@Controller('me/teaching-skills')
export class TeachingController {
  constructor(private readonly teaching: TeachingService) {}

  @Put()
  @ApiOperation({ summary: 'Define o que eu sei ensinar' })
  replace(
    @RequiredUser() user: AuthenticatedUser,
    @Body() body: ReplaceTeachingSkillsDto,
  ): Promise<TeachingSkillView[]> {
    return this.teaching.replace(user.id, body);
  }
}
