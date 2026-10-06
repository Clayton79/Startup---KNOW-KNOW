import { z } from 'zod';
import { LIMITS, SESSION_DURATIONS_MINUTES } from '../constants';
import {
  meetingProviderSchema,
  sessionModeSchema,
  type Confirmation,
  type MeetingProvider,
  type SessionMode,
  type SessionStatus,
} from '../enums';
import { paginationQueryShape } from './common';

const isoDateTime = z.iso.datetime({ offset: true });

const durationSchema = z
  .number()
  .int()
  .refine((value) => (SESSION_DURATIONS_MINUTES as readonly number[]).includes(value), {
    message: 'Escolha 30, 60, 90 ou 120 minutos.',
  });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

/** Link de reunião: só https (bloqueia javascript:, data: etc.). */
export const meetingUrlSchema = z
  .url({ protocol: /^https$/, error: 'Use um link que comece com https://' })
  .max(500);

export const createSessionSchema = z.object({
  mentorId: z.uuid(),
  skillId: z.uuid(),
  startsAt: isoDateTime,
  durationMinutes: durationSchema,
  mode: sessionModeSchema,
  /** Preferência do aluno (o mentor pode ajustar ao aceitar). Ignorada em aulas presenciais. */
  meetingProvider: meetingProviderSchema.optional(),
  note: optionalText(LIMITS.sessionNote.max),
});
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const acceptSessionSchema = z.object({
  meetingProvider: meetingProviderSchema.optional(),
  meetingUrl: meetingUrlSchema.nullable().optional(),
  locationNote: optionalText(200),
});
export type AcceptSessionInput = z.infer<typeof acceptSessionSchema>;

export const proposeTimeSchema = z.object({ startsAt: isoDateTime });
export type ProposeTimeInput = z.infer<typeof proposeTimeSchema>;

export const reasonSchema = z.object({ reason: optionalText(200) });
export type ReasonInput = z.infer<typeof reasonSchema>;

export const updateMeetingSchema = z.object({
  meetingProvider: meetingProviderSchema.optional(),
  meetingUrl: meetingUrlSchema.nullable().optional(),
  locationNote: optionalText(200),
});
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;

export const confirmSessionSchema = z.object({ happened: z.boolean() });
export type ConfirmSessionInput = z.infer<typeof confirmSessionSchema>;

export const listSessionsQuerySchema = z.object({
  ...paginationQueryShape,
  scope: z.enum(['all', 'upcoming', 'pending', 'past']).default('all'),
  role: z.enum(['MENTOR', 'STUDENT']).optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
});
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;

export const slotsQuerySchema = z.object({
  /** Aula de interesse, para saber quanto tempo reservar em cada horário. */
  durationMinutes: z.coerce
    .number()
    .int()
    .refine((value) => (SESSION_DURATIONS_MINUTES as readonly number[]).includes(value)),
  days: z.coerce.number().int().min(1).max(21).default(14),
});
export type SlotsQuery = z.infer<typeof slotsQuerySchema>;

// ───────────── Respostas ─────────────

export type SessionAction =
  'ACCEPT' | 'REJECT' | 'PROPOSE_TIME' | 'CANCEL' | 'CONFIRM' | 'REVIEW' | 'UPDATE_MEETING';

export interface PersonSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface SessionView {
  id: string;
  status: SessionStatus;
  skill: { id: string; name: string };
  mode: SessionMode;
  meetingProvider: MeetingProvider;
  /** Só aparece para os dois participantes, depois que a aula é aceita. */
  meetingUrl: string | null;
  locationNote: string | null;
  note: string | null;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  creditCost: number;
  mentor: PersonSummary;
  student: PersonSummary;
  myRole: 'MENTOR' | 'STUDENT';
  /** Quem fez a última proposta de horário. */
  lastProposedById: string;
  /** Em PENDING: é a minha vez de responder? */
  awaitingMyResponse: boolean;
  myConfirmation: Confirmation | null;
  /** Se a outra pessoa já respondeu "essa aula aconteceu?" (sem revelar a resposta). */
  otherHasConfirmed: boolean;
  /** Já avaliei esta aula? */
  reviewedByMe: boolean;
  allowedActions: SessionAction[];
  createdAt: string;
}

export interface SlotView {
  startsAt: string;
  endsAt: string;
}

export interface AvailableSlots {
  timezone: string;
  slots: SlotView[];
}
