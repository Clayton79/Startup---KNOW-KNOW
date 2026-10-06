/** Durações de aula permitidas, em minutos. Garantem custos inteiros em créditos. */
export const SESSION_DURATIONS_MINUTES = [30, 60, 90, 120] as const;
export type SessionDurationMinutes = (typeof SESSION_DURATIONS_MINUTES)[number];

export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

export const PAGINATION = {
  defaultPageSize: 12,
  maxPageSize: 50,
} as const;

export const LIMITS = {
  displayName: { min: 2, max: 60 },
  bio: { max: 500 },
  city: { max: 80 },
  skillDescription: { max: 300 },
  reviewComment: { max: 300 },
  sessionNote: { max: 500 },
  reportDetails: { max: 1000 },
  maxTeachingSkills: 20,
  maxLearningSkills: 20,
  maxAvailabilityRules: 28,
} as const;

/** Arquivos aceitos para avatar. */
export const AVATAR_RULES = {
  maxBytes: 2 * 1024 * 1024,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const;
