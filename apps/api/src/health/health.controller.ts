import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../database/prisma.service';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: usado pelo Render. Não toca no banco. */
  @Get()
  @ApiOkResponse({ description: 'A API está de pé.' })
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness: confirma que o banco responde. */
  @Get('ready')
  @ApiOkResponse({ description: 'A API e o banco estão prontos.' })
  async ready(): Promise<{ status: 'ok'; database: 'ok' }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'ok' };
  }
}
