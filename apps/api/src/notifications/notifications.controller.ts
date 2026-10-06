import { Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  paginationQuerySchema,
  type NotificationView,
  type Paginated,
  type UnreadCount,
} from '@know-know/shared';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequiredUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

class PaginationDto extends createZodDto(paginationQuerySchema) {}
class IdParams extends createZodDto(z.object({ id: z.uuid() })) {}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Minhas notificações (mais recentes primeiro)' })
  list(
    @RequiredUser() user: AuthenticatedUser,
    @Query() query: PaginationDto,
  ): Promise<Paginated<NotificationView>> {
    return this.notifications.list(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Quantas notificações ainda não li' })
  async unreadCount(@RequiredUser() user: AuthenticatedUser): Promise<UnreadCount> {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Post('read-all')
  @HttpCode(204)
  @ApiOperation({ summary: 'Marca todas como lidas' })
  async readAll(@RequiredUser() user: AuthenticatedUser): Promise<void> {
    await this.notifications.markAllRead(user.id);
  }

  @Patch(':id/read')
  @HttpCode(204)
  @ApiOperation({ summary: 'Marca uma notificação como lida' })
  async markRead(
    @RequiredUser() user: AuthenticatedUser,
    @Param() params: IdParams,
  ): Promise<void> {
    await this.notifications.markRead(user.id, params.id);
  }
}
