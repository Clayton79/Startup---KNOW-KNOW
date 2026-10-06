import { z } from 'zod';

const envSchema = z.object({
  /** Vazio = mesma origem (proxy do Vite em dev). Em produção aponta para a API no Render. */
  VITE_API_URL: z.string().default(''),
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
});

export type WebEnv = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(import.meta.env);

/** Variáveis ausentes/inválidas, para exibir uma tela de configuração em vez de uma página em branco. */
export const envProblems: string[] = parsed.success
  ? []
  : parsed.error.issues.map((issue) => issue.path.join('.'));

/**
 * Só use depois de checar `envProblems`. Em desenvolvimento sem Supabase configurado,
 * o app mostra a tela de configuração antes de qualquer consumo deste valor.
 */
export const env: WebEnv = parsed.success
  ? parsed.data
  : {
      VITE_API_URL: '',
      VITE_SUPABASE_URL: 'http://invalid.local',
      VITE_SUPABASE_ANON_KEY: 'invalid',
    };
