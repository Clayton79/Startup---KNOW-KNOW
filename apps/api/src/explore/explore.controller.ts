import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { exploreQuerySchema, type ExploreCard, type Paginated } from '@know-know/shared';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser, RequiredUser } from '../auth/decorators/current-user.decorator';
import { OptionalAuth } from '../auth/decorators/public.decorator';
import { ExploreService } from './explore.service';

class ExploreQueryDto extends createZodDto(exploreQuerySchema) {}
class MatchesQueryDto extends createZodDto(
  z.object({ limit: z.coerce.number().int().min(1).max(30).default(12) }),
) {}

@ApiTags('explore')
@Controller()
export class ExploreController {
  constructor(private readonly explore: ExploreService) {}

  @OptionalAuth()
  @ApiBearerAuth()
  @Get('explore')
  @ApiOperation({
    summary: 'Procura pessoas que ensinam algo',
    description:
      'Aberta a todos. Com login, cada resultado vem com a compatibilidade (match) e a ordem considera isso.',
  })
  search(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: ExploreQueryDto,
  ): Promise<Paginated<ExploreCard>> {
    return this.explore.search(user?.id ?? null, query);
  }

  @ApiBearerAuth()
  @Get('matches')
  @ApiOperation({
    summary: 'Pessoas que podem ensinar o que eu quero aprender, por compatibilidade',
  })
  matches(
    @RequiredUser() user: AuthenticatedUser,
    @Query() query: MatchesQueryDto,
  ): Promise<ExploreCard[]> {
    return this.explore.recommendations(user.id, query.limit);
  }
}
