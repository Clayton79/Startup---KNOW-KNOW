import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SESSION_DURATIONS_MINUTES, type PublicConfig } from '@know-know/shared';
import { Public } from '../auth/decorators/public.decorator';
import { AppConfig } from '../config/app-config.service';

@Public()
@ApiTags('config')
@Controller('config')
export class PlatformConfigController {
  constructor(private readonly config: AppConfig) {}

  /** Regras públicas da plataforma. O frontend lê daqui em vez de fixar valores no código. */
  @Get()
  @ApiOkResponse({ description: 'Taxa de créditos, bônus de boas-vindas e durações permitidas.' })
  getPublicConfig(): PublicConfig {
    return {
      creditsPerHour: this.config.creditsPerHour,
      welcomeBonusCredits: this.config.welcomeBonusCredits,
      sessionDurationsMinutes: [...SESSION_DURATIONS_MINUTES],
    };
  }
}
