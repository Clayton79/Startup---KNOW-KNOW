import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createReportSchema } from '@know-know/shared';
import { createZodDto } from 'nestjs-zod';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequiredUser } from '../auth/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

class CreateReportDto extends createZodDto(createReportSchema) {}

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Denuncia uma pessoa (a equipe analisa)' })
  async create(
    @RequiredUser() user: AuthenticatedUser,
    @Body() body: CreateReportDto,
  ): Promise<void> {
    await this.reports.create(user.id, body);
  }
}
