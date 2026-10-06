import { z } from 'zod';

/** Códigos de erro estáveis da API. O frontend decide a mensagem a partir deles quando precisa. */
export const ApiErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  SELF_SESSION: 'SELF_SESSION',
  OUTSIDE_AVAILABILITY: 'OUTSIDE_AVAILABILITY',
  TIME_CONFLICT: 'TIME_CONFLICT',
  INVALID_SESSION_STATE: 'INVALID_SESSION_STATE',
  SESSION_NOT_FINISHED: 'SESSION_NOT_FINISHED',
  ALREADY_CONFIRMED: 'ALREADY_CONFIRMED',
  ALREADY_REVIEWED: 'ALREADY_REVIEWED',
  REVIEW_NOT_ALLOWED: 'REVIEW_NOT_ALLOWED',
  SKILL_NOT_TAUGHT: 'SKILL_NOT_TAUGHT',
  ONBOARDING_REQUIRED: 'ONBOARDING_REQUIRED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
} as const;
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
