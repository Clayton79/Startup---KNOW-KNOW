import { z } from 'zod';

/** Configuração pública da plataforma (GET /config). A API é a fonte da verdade. */
export const publicConfigSchema = z.object({
  creditsPerHour: z.number().int().positive(),
  welcomeBonusCredits: z.number().int().nonnegative(),
  sessionDurationsMinutes: z.array(z.number().int().positive()),
});
export type PublicConfig = z.infer<typeof publicConfigSchema>;
