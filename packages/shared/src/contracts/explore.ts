import { z } from 'zod';
import {
  preferredModeSchema,
  skillLevelSchema,
  type PreferredMode,
  type SkillLevel,
} from '../enums';
import { paginationQueryShape } from './common';
import type { AvailabilityRuleView, ReputationView } from './profile';

const booleanFromQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

export const exploreQuerySchema = z.object({
  ...paginationQueryShape,
  skillId: z.uuid().optional(),
  /** Texto livre: nome da habilidade ou da pessoa. */
  q: z.string().trim().max(60).optional(),
  /** Nível mínimo do mentor naquela habilidade. */
  level: skillLevelSchema.optional(),
  /** Nota média mínima (1–5). */
  minRating: z.coerce.number().min(1).max(5).optional(),
  mode: preferredModeSchema.exclude(['BOTH']).optional(),
  /** Só quem informou horários disponíveis. */
  available: booleanFromQuery.optional(),
});
export type ExploreQuery = z.infer<typeof exploreQuerySchema>;

export type MatchLabel = 'EXCELLENT' | 'GOOD' | 'POSSIBLE';

export interface MatchView {
  /** 0–100. */
  score: number;
  label: MatchLabel | null;
  /** Os dois têm algo a ensinar um ao outro. */
  mutual: boolean;
  /** Frase pronta para exibir ("Vocês podem aprender um com o outro."). */
  headline: string | null;
  /** O que pesou na pontuação, em linguagem simples. */
  reasons: string[];
}

export interface ExploreCard {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  skill: { id: string; name: string };
  level: SkillLevel;
  description: string | null;
  reputation: ReputationView;
  sessionsTaught: number;
  preferredMode: PreferredMode;
  city: string | null;
  state: string | null;
  /** Custo de uma hora de aula, em créditos. */
  creditsPerHour: number;
  availability: AvailabilityRuleView[];
  /** Só vem preenchido quando há usuário logado. */
  match: MatchView | null;
}
