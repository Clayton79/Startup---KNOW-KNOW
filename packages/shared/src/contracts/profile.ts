import { z } from 'zod';
import { LIMITS } from '../constants';
import {
  preferredModeSchema,
  skillLevelSchema,
  type PreferredMode,
  type ProfileRole,
} from '../enums';

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(LIMITS.displayName.min).max(LIMITS.displayName.max),
    bio: optionalText(LIMITS.bio.max),
    city: optionalText(LIMITS.city.max),
    state: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase())
      .nullable()
      .optional(),
    preferredMode: preferredModeSchema,
    timezone: z.string().refine(isValidTimeZone, 'Fuso horário inválido'),
    /** Caminho do arquivo já enviado ao Storage (ver POST /me/avatar-upload-url). */
    avatarPath: z.string().max(255).nullable(),
  })
  .partial()
  .strict();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const onboardingStepSchema = z.object({
  step: z.number().int().min(0).max(5),
});
export type OnboardingStepInput = z.infer<typeof onboardingStepSchema>;

export const avatarUploadRequestSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z.number().int().positive(),
});
export type AvatarUploadRequest = z.infer<typeof avatarUploadRequestSchema>;

export interface AvatarUploadTicket {
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
}

export const teachingSkillInputSchema = z.object({
  skillId: z.uuid(),
  level: skillLevelSchema,
  description: z
    .string()
    .trim()
    .max(LIMITS.skillDescription.max)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
});
export const replaceTeachingSkillsSchema = z.object({
  skills: z
    .array(teachingSkillInputSchema)
    .max(LIMITS.maxTeachingSkills)
    .refine((items) => new Set(items.map((i) => i.skillId)).size === items.length, {
      message: 'Há habilidades repetidas.',
    }),
});
export type ReplaceTeachingSkillsInput = z.infer<typeof replaceTeachingSkillsSchema>;

export const learningSkillInputSchema = z.object({
  skillId: z.uuid(),
  desiredLevel: skillLevelSchema.nullable().optional(),
});
export const replaceLearningSkillsSchema = z.object({
  skills: z
    .array(learningSkillInputSchema)
    .max(LIMITS.maxLearningSkills)
    .refine((items) => new Set(items.map((i) => i.skillId)).size === items.length, {
      message: 'Há habilidades repetidas.',
    }),
});
export type ReplaceLearningSkillsInput = z.infer<typeof replaceLearningSkillsSchema>;

export const availabilityRuleInputSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
  })
  .refine((rule) => rule.startMinute < rule.endMinute, {
    message: 'O horário final precisa ser depois do inicial.',
    path: ['endMinute'],
  });
export const replaceAvailabilitySchema = z.object({
  rules: z.array(availabilityRuleInputSchema).max(LIMITS.maxAvailabilityRules),
});
export type ReplaceAvailabilityInput = z.infer<typeof replaceAvailabilitySchema>;

// ───────────── Respostas ─────────────

export interface SkillSummary {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
}

export interface TeachingSkillView {
  skill: SkillSummary;
  level: z.infer<typeof skillLevelSchema>;
  description: string | null;
}

export interface LearningSkillView {
  skill: SkillSummary;
  desiredLevel: z.infer<typeof skillLevelSchema> | null;
}

export interface AvailabilityRuleView {
  id: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface ReputationView {
  average: number | null;
  count: number;
}

/** Perfil do próprio usuário (GET /me). */
export interface MeProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  avatarPath: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  preferredMode: PreferredMode;
  timezone: string;
  role: ProfileRole;
  createdAt: string;
  onboarding: { step: number; completed: boolean };
  teachingSkills: TeachingSkillView[];
  learningSkills: LearningSkillView[];
  availability: AvailabilityRuleView[];
  reputation: ReputationView;
  sessionsTaught: number;
  sessionsLearned: number;
}

/** Perfil de outra pessoa (GET /users/:id). Sem dados pessoais além do necessário para a troca. */
export interface PublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  preferredMode: PreferredMode;
  timezone: string;
  memberSince: string;
  reputation: ReputationView;
  mentorReputation: ReputationView;
  sessionsTaught: number;
  sessionsLearned: number;
  teachingSkills: TeachingSkillView[];
  learningSkills: LearningSkillView[];
  availability: AvailabilityRuleView[];
}

export interface SkillCatalogCategory {
  id: string;
  name: string;
  slug: string;
  skills: { id: string; name: string; slug: string }[];
}

/** Exclusão de conta: a pessoa precisa digitar a palavra para confirmar. */
export const deleteAccountSchema = z.object({
  confirmation: z.literal('EXCLUIR', { error: 'Digite EXCLUIR para confirmar.' }),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
