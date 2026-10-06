import { z } from 'zod';
import { LIMITS } from '../constants';
import { reviewCategorySchema, type ReviewCategory, type ReviewDirection } from '../enums';
import { paginationQueryShape } from './common';
import type { PersonSummary } from './sessions';

export const createReviewSchema = z.object({
  scores: z
    .array(
      z.object({
        category: reviewCategorySchema,
        score: z.number().int().min(1, 'Dê uma nota de 1 a 5.').max(5, 'Dê uma nota de 1 a 5.'),
      }),
    )
    .min(1)
    .max(5),
  comment: z
    .string()
    .trim()
    .max(LIMITS.reviewComment.max)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const listReviewsQuerySchema = z.object({ ...paginationQueryShape });

export interface ReviewView {
  id: string;
  sessionId: string;
  direction: ReviewDirection;
  /** Nota geral (1–5). */
  rating: number;
  scores: { category: ReviewCategory; score: number }[];
  comment: string | null;
  skillName: string;
  author: PersonSummary;
  createdAt: string;
}

/** Aula concluída que ainda espera a minha avaliação. */
export interface PendingReviewView {
  sessionId: string;
  skillName: string;
  endedAt: string;
  /** A pessoa que eu vou avaliar. */
  other: PersonSummary;
  direction: ReviewDirection;
}
