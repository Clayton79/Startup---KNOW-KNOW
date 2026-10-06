import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SkillCatalogCategory } from '@know-know/shared';
import { Public } from '../auth/decorators/public.decorator';
import { SkillsService } from './skills.service';

@ApiTags('skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skills: SkillsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Catálogo de habilidades agrupado por categoria' })
  list(): Promise<SkillCatalogCategory[]> {
    return this.skills.listCatalog();
  }
}
