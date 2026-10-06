import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { replaceAvailabilitySchema, type AvailabilityRuleView } from '@know-know/shared';
import { createZodDto } from 'nestjs-zod';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequiredUser } from '../auth/decorators/current-user.decorator';
import { AvailabilityService } from './availability.service';

class ReplaceAvailabilityDto extends createZodDto(replaceAvailabilitySchema) {}

@ApiTags('availability')
@ApiBearerAuth()
@Controller('me/availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  @ApiOperation({ summary: 'Meus horários semanais disponíveis' })
  list(@RequiredUser() user: AuthenticatedUser): Promise<AvailabilityRuleView[]> {
    return this.availability.list(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Define meus horários semanais disponíveis' })
  replace(
    @RequiredUser() user: AuthenticatedUser,
    @Body() body: ReplaceAvailabilityDto,
  ): Promise<AvailabilityRuleView[]> {
    return this.availability.replace(user.id, body);
  }
}
