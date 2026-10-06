import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ProfileRole,
  adminAdjustCreditsSchema,
  adminCreateSkillSchema,
  adminListReportsQuerySchema,
  adminListUsersQuerySchema,
  adminResolveSessionSchema,
  adminSetUserStatusSchema,
  adminUpdateReportSchema,
  adminUpdateSkillSchema,
  type AdminDisputeView,
  type AdminReportView,
  type AdminSkillView,
  type AdminStats,
  type AdminUserView,
  type Paginated,
} from '@know-know/shared';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequiredUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SessionsService } from '../sessions/sessions.service';
import { AdminService } from './admin.service';

class IdParams extends createZodDto(z.object({ id: z.uuid() })) {}
class ListUsersDto extends createZodDto(adminListUsersQuerySchema) {}
class SetUserStatusDto extends createZodDto(adminSetUserStatusSchema) {}
class ListReportsDto extends createZodDto(adminListReportsQuerySchema) {}
class UpdateReportDto extends createZodDto(adminUpdateReportSchema) {}
class CreateSkillDto extends createZodDto(adminCreateSkillSchema) {}
class UpdateSkillDto extends createZodDto(adminUpdateSkillSchema) {}
class AdjustCreditsDto extends createZodDto(adminAdjustCreditsSchema) {}
class ResolveSessionDto extends createZodDto(adminResolveSessionSchema) {}

/** Todas as rotas exigem papel ADMIN, conferido no banco a cada requisição (RolesGuard). */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(ProfileRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly sessions: SessionsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Números gerais da plataforma' })
  stats(): Promise<AdminStats> {
    return this.admin.stats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Lista usuários' })
  listUsers(@Query() query: ListUsersDto): Promise<Paginated<AdminUserView>> {
    return this.admin.listUsers(query);
  }

  @Patch('users/:id/status')
  @HttpCode(204)
  @ApiOperation({ summary: 'Suspende ou reativa uma conta' })
  async setUserStatus(
    @RequiredUser() admin: AuthenticatedUser,
    @Param() params: IdParams,
    @Body() body: SetUserStatusDto,
  ): Promise<void> {
    await this.admin.setUserStatus(admin.id, params.id, body.status);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Lista denúncias' })
  listReports(@Query() query: ListReportsDto): Promise<Paginated<AdminReportView>> {
    return this.admin.listReports(query);
  }

  @Patch('reports/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Atualiza o andamento de uma denúncia' })
  async updateReport(
    @RequiredUser() admin: AuthenticatedUser,
    @Param() params: IdParams,
    @Body() body: UpdateReportDto,
  ): Promise<void> {
    await this.admin.updateReport(admin.id, params.id, body);
  }

  @Get('skills')
  @ApiOperation({ summary: 'Lista todos os conhecimentos (inclui os desativados)' })
  listSkills(): Promise<AdminSkillView[]> {
    return this.admin.listSkills();
  }

  @Get('skill-categories')
  @ApiOperation({ summary: 'Lista as categorias' })
  listCategories(): Promise<{ id: string; name: string }[]> {
    return this.admin.listCategories();
  }

  @Post('skills')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cria um conhecimento' })
  async createSkill(@Body() body: CreateSkillDto): Promise<void> {
    await this.admin.createSkill(body);
  }

  @Patch('skills/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Renomeia, move ou (des)ativa um conhecimento' })
  async updateSkill(@Param() params: IdParams, @Body() body: UpdateSkillDto): Promise<void> {
    await this.admin.updateSkill(params.id, body);
  }

  @Post('credits/adjust')
  @ApiOperation({ summary: 'Ajuste manual de créditos (auditado no ledger)' })
  async adjustCredits(
    @RequiredUser() admin: AuthenticatedUser,
    @Body() body: AdjustCreditsDto,
  ): Promise<{ balance: number }> {
    return { balance: await this.admin.adjustCredits(admin.id, body) };
  }

  @Get('disputes')
  @ApiOperation({ summary: 'Aulas em revisão (respostas divergentes)' })
  listDisputes(): Promise<AdminDisputeView[]> {
    return this.admin.listDisputes();
  }

  @Post('sessions/:id/resolve')
  @HttpCode(204)
  @ApiOperation({ summary: 'Resolve uma aula em revisão: concluir (paga) ou cancelar (estorna)' })
  async resolveSession(
    @RequiredUser() admin: AuthenticatedUser,
    @Param() params: IdParams,
    @Body() body: ResolveSessionDto,
  ): Promise<void> {
    await this.sessions.resolveDispute(admin.id, params.id, body.outcome);
  }
}
