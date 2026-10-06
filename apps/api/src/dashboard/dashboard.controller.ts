import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DashboardView } from '@know-know/shared';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequiredUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Resumo do painel: saldo, próximas aulas, pendências e recomendações' })
  get(@RequiredUser() user: AuthenticatedUser): Promise<DashboardView> {
    return this.dashboard.get(user.id);
  }
}
