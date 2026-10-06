import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  acceptSessionSchema,
  confirmSessionSchema,
  createSessionSchema,
  listSessionsQuerySchema,
  proposeTimeSchema,
  updateMeetingSchema,
  type Paginated,
  type SessionView,
} from '@know-know/shared';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequiredUser } from '../auth/decorators/current-user.decorator';
import { SessionsService } from './sessions.service';

class CreateSessionDto extends createZodDto(createSessionSchema) {}
class ListSessionsDto extends createZodDto(listSessionsQuerySchema) {}
class AcceptSessionDto extends createZodDto(acceptSessionSchema) {}
class ProposeTimeDto extends createZodDto(proposeTimeSchema) {}
class UpdateMeetingDto extends createZodDto(updateMeetingSchema) {}
class ConfirmSessionDto extends createZodDto(confirmSessionSchema) {}
class SessionIdParams extends createZodDto(z.object({ id: z.uuid() })) {}

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Solicita uma aula (reserva os créditos do aluno)' })
  create(
    @RequiredUser() user: AuthenticatedUser,
    @Body() body: CreateSessionDto,
  ): Promise<SessionView> {
    return this.sessions.create(user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'Minhas aulas (como aluno e/ou mentor)' })
  list(
    @RequiredUser() user: AuthenticatedUser,
    @Query() query: ListSessionsDto,
  ): Promise<Paginated<SessionView>> {
    return this.sessions.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes de uma aula (só para os participantes)' })
  get(
    @RequiredUser() user: AuthenticatedUser,
    @Param() params: SessionIdParams,
  ): Promise<SessionView> {
    return this.sessions.get(user.id, params.id);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Aceita a solicitação (ou a contraproposta de horário)' })
  accept(
    @RequiredUser() user: AuthenticatedUser,
    @Param() params: SessionIdParams,
    @Body() body: AcceptSessionDto,
  ): Promise<SessionView> {
    return this.sessions.accept(user.id, params.id, body);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Recusa a solicitação (libera os créditos reservados)' })
  reject(
    @RequiredUser() user: AuthenticatedUser,
    @Param() params: SessionIdParams,
  ): Promise<SessionView> {
    return this.sessions.reject(user.id, params.id);
  }

  @Patch(':id/propose-time')
  @ApiOperation({ summary: 'Sugere outro horário' })
  proposeTime(
    @RequiredUser() user: AuthenticatedUser,
    @Param() params: SessionIdParams,
    @Body() body: ProposeTimeDto,
  ): Promise<SessionView> {
    return this.sessions.proposeTime(user.id, params.id, body);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancela a solicitação ou a aula (antes de começar)' })
  cancel(
    @RequiredUser() user: AuthenticatedUser,
    @Param() params: SessionIdParams,
  ): Promise<SessionView> {
    return this.sessions.cancel(user.id, params.id);
  }

  @Patch(':id/meeting')
  @ApiOperation({ summary: 'Define o link da reunião ou o local (só o mentor)' })
  updateMeeting(
    @RequiredUser() user: AuthenticatedUser,
    @Param() params: SessionIdParams,
    @Body() body: UpdateMeetingDto,
  ): Promise<SessionView> {
    return this.sessions.updateMeeting(user.id, params.id, body);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Confirma se a aula aconteceu',
    description:
      'Quando os dois respondem "sim", a aula é concluída e os créditos são transferidos (uma única vez).',
  })
  confirm(
    @RequiredUser() user: AuthenticatedUser,
    @Param() params: SessionIdParams,
    @Body() body: ConfirmSessionDto,
  ): Promise<SessionView> {
    return this.sessions.confirm(user.id, params.id, body);
  }
}
