import { z } from 'zod';
import { LIMITS } from '../constants';
import {
  profileStatusSchema,
  reportReasonSchema,
  reportStatusSchema,
  type ProfileRole,
  type ProfileStatus,
  type ReportReason,
  type ReportStatus,
} from '../enums';
import { paginationQueryShape } from './common';

// ───────────── Denúncias (qualquer usuário) ─────────────

export const createReportSchema = z.object({
  targetUserId: z.uuid(),
  sessionId: z.uuid().optional(),
  reason: reportReasonSchema,
  details: z
    .string()
    .trim()
    .max(LIMITS.reportDetails.max)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

// ───────────── Administração ─────────────

export const adminListUsersQuerySchema = z.object({
  ...paginationQueryShape,
  q: z.string().trim().max(60).optional(),
  status: profileStatusSchema.optional(),
});
export type AdminListUsersQuery = z.infer<typeof adminListUsersQuerySchema>;

export const adminSetUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

export const adminListReportsQuerySchema = z.object({
  ...paginationQueryShape,
  status: reportStatusSchema.optional(),
});
export type AdminListReportsQuery = z.infer<typeof adminListReportsQuerySchema>;

export const adminUpdateReportSchema = z.object({
  status: reportStatusSchema,
  resolutionNote: z.string().trim().max(500).nullable().optional(),
});

export const adminCreateSkillSchema = z.object({
  categoryId: z.uuid(),
  name: z.string().trim().min(2).max(60),
});

export const adminUpdateSkillSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  categoryId: z.uuid().optional(),
  isActive: z.boolean().optional(),
});

export const adminAdjustCreditsSchema = z.object({
  userId: z.uuid(),
  /** Positivo credita, negativo debita. */
  amount: z
    .number()
    .int()
    .refine((value) => value !== 0, 'Informe um valor diferente de zero.')
    .refine((value) => Math.abs(value) <= 1000, 'O ajuste máximo é de 1.000 créditos por vez.'),
  description: z.string().trim().min(3).max(150),
});

export const adminResolveSessionSchema = z.object({
  outcome: z.enum(['COMPLETE', 'CANCEL']),
});

export interface AdminUserView {
  id: string;
  displayName: string;
  role: ProfileRole;
  status: ProfileStatus;
  createdAt: string;
  sessionsTaught: number;
  sessionsLearned: number;
  balance: number;
}

export interface AdminReportView {
  id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  resolutionNote: string | null;
  reporter: { id: string; displayName: string };
  target: { id: string; displayName: string; status: ProfileStatus };
  sessionId: string | null;
}

export interface AdminSkillView {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  categoryId: string;
  categoryName: string;
}

export interface AdminStats {
  users: number;
  activeUsers: number;
  sessionsCompleted: number;
  sessionsDisputed: number;
  openReports: number;
  creditsInCirculation: number;
}

export interface AdminDisputeView {
  id: string;
  skillName: string;
  startsAt: string;
  durationMinutes: number;
  creditCost: number;
  mentor: { id: string; displayName: string };
  student: { id: string; displayName: string };
}
