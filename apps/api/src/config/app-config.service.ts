import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env';

/** Acesso tipado às variáveis de ambiente e às regras configuráveis de negócio. */
@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  /** Taxa de conversão tempo → créditos. Única fonte da verdade do valor "10". */
  get creditsPerHour(): number {
    return this.get('CREDITS_PER_HOUR');
  }

  get welcomeBonusCredits(): number {
    return this.get('WELCOME_BONUS_CREDITS');
  }

  /** Custo em créditos de uma aula. Arredonda para cima para sempre ser inteiro. */
  creditCostFor(durationMinutes: number): number {
    return Math.ceil((this.creditsPerHour * durationMinutes) / 60);
  }
}
