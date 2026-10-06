import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  paginationQuerySchema,
  type Paginated,
  type TransactionView,
  type WalletView,
} from '@know-know/shared';
import { createZodDto } from 'nestjs-zod';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequiredUser } from '../auth/decorators/current-user.decorator';
import { CreditsService } from '../credits/credits.service';
import { SessionsService } from '../sessions/sessions.service';

class PaginationDto extends createZodDto(paginationQuerySchema) {}

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly credits: CreditsService,
    private readonly sessions: SessionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Meu saldo de créditos (total, reservado e disponível)' })
  async getWallet(@RequiredUser() user: AuthenticatedUser): Promise<WalletView> {
    // Solicitações vencidas liberam a reserva antes de mostrar o saldo.
    await this.sessions.expireStale(user.id);
    return this.credits.getWallet(user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Meu histórico de créditos (mais recentes primeiro)' })
  listTransactions(
    @RequiredUser() user: AuthenticatedUser,
    @Query() query: PaginationDto,
  ): Promise<Paginated<TransactionView>> {
    return this.credits.listTransactions(user.id, query);
  }
}
