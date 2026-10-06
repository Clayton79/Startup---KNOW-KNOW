import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  createReviewSchema,
  listReviewsQuerySchema,
  type Paginated,
  type PendingReviewView,
  type ReviewView,
} from '@know-know/shared';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequiredUser } from '../auth/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';

class CreateReviewDto extends createZodDto(createReviewSchema) {}
class ListReviewsDto extends createZodDto(listReviewsQuerySchema) {}
class SessionIdParams extends createZodDto(z.object({ id: z.uuid() })) {}

@ApiTags('reviews')
@ApiBearerAuth()
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('sessions/:id/reviews')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Avalia a outra pessoa de uma aula concluída (uma vez por aula)' })
  create(
    @RequiredUser() user: AuthenticatedUser,
    @Param() params: SessionIdParams,
    @Body() body: CreateReviewDto,
  ): Promise<ReviewView> {
    return this.reviews.create(user.id, params.id, body);
  }

  @Get('me/reviews')
  @ApiOperation({ summary: 'Avaliações que recebi' })
  received(
    @RequiredUser() user: AuthenticatedUser,
    @Query() query: ListReviewsDto,
  ): Promise<Paginated<ReviewView>> {
    return this.reviews.listReceived(user.id, query);
  }

  @Get('me/reviews/pending')
  @ApiOperation({ summary: 'Aulas que ainda estão esperando a minha avaliação' })
  pending(@RequiredUser() user: AuthenticatedUser): Promise<PendingReviewView[]> {
    return this.reviews.listPending(user.id);
  }
}
