import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  listReviewsQuerySchema,
  slotsQuerySchema,
  type Paginated,
  type ReviewView,
  type AvailableSlots,
  type PublicProfile,
} from '@know-know/shared';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { AvailabilityService } from '../availability/availability.service';
import { ReviewsService } from '../reviews/reviews.service';
import { UsersService } from './users.service';

class UserIdParams extends createZodDto(z.object({ id: z.uuid() })) {}
class SlotsQueryDto extends createZodDto(slotsQuerySchema) {}
class ReviewsQueryDto extends createZodDto(listReviewsQuerySchema) {}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly availability: AvailabilityService,
    private readonly reviews: ReviewsService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Perfil público de outra pessoa' })
  getPublicProfile(@Param() params: UserIdParams): Promise<PublicProfile> {
    return this.users.getPublicProfile(params.id);
  }

  @Get(':id/slots')
  @ApiOperation({ summary: 'Horários livres de uma pessoa para uma aula de certa duração' })
  getSlots(@Param() params: UserIdParams, @Query() query: SlotsQueryDto): Promise<AvailableSlots> {
    return this.availability.getSlots(params.id, query);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Avaliações que uma pessoa recebeu' })
  getReviews(
    @Param() params: UserIdParams,
    @Query() query: ReviewsQueryDto,
  ): Promise<Paginated<ReviewView>> {
    return this.reviews.listReceived(params.id, query);
  }
}
