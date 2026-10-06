import { z } from 'zod';

/**
 * Enums de domínio compartilhados. Os valores precisam ser idênticos aos enums do
 * `schema.prisma` (há um teste na api que garante isso).
 */
function defineEnum<const T extends readonly [string, ...string[]]>(values: T) {
  const object = Object.fromEntries(values.map((v) => [v, v])) as { [K in T[number]]: K };
  return { values, object, schema: z.enum(values) };
}

const profileRole = defineEnum(['USER', 'ADMIN']);
export const ProfileRole = profileRole.object;
export type ProfileRole = (typeof ProfileRole)[keyof typeof ProfileRole];
export const profileRoleSchema = profileRole.schema;

const profileStatus = defineEnum(['ACTIVE', 'SUSPENDED', 'DELETED']);
export const ProfileStatus = profileStatus.object;
export type ProfileStatus = (typeof ProfileStatus)[keyof typeof ProfileStatus];
export const profileStatusSchema = profileStatus.schema;

const preferredMode = defineEnum(['ONLINE', 'IN_PERSON', 'BOTH']);
export const PreferredMode = preferredMode.object;
export type PreferredMode = (typeof PreferredMode)[keyof typeof PreferredMode];
export const preferredModeSchema = preferredMode.schema;

const skillLevel = defineEnum(['BASIC', 'INTERMEDIATE', 'ADVANCED']);
export const SkillLevel = skillLevel.object;
export type SkillLevel = (typeof SkillLevel)[keyof typeof SkillLevel];
export const skillLevelSchema = skillLevel.schema;
/** Ordem crescente de nível, usada para comparar "ensina nível ≥ desejado". */
export const SKILL_LEVEL_ORDER: Record<SkillLevel, number> = {
  BASIC: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
};

const sessionMode = defineEnum(['ONLINE', 'IN_PERSON']);
export const SessionMode = sessionMode.object;
export type SessionMode = (typeof SessionMode)[keyof typeof SessionMode];
export const sessionModeSchema = sessionMode.schema;

const meetingProvider = defineEnum(['GOOGLE_MEET', 'DISCORD', 'OTHER', 'IN_PERSON']);
export const MeetingProvider = meetingProvider.object;
export type MeetingProvider = (typeof MeetingProvider)[keyof typeof MeetingProvider];
export const meetingProviderSchema = meetingProvider.schema;

const sessionStatus = defineEnum([
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED',
  'IN_PROGRESS',
  'AWAITING_CONFIRMATION',
  'COMPLETED',
  'NO_SHOW',
  'DISPUTED',
]);
export const SessionStatus = sessionStatus.object;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];
export const sessionStatusSchema = sessionStatus.schema;

const confirmation = defineEnum(['YES', 'NO']);
export const Confirmation = confirmation.object;
export type Confirmation = (typeof Confirmation)[keyof typeof Confirmation];
export const confirmationSchema = confirmation.schema;

const creditTransactionType = defineEnum([
  'EARNED_CLASS',
  'SPENT_CLASS',
  'BONUS',
  'REFUND',
  'ADMIN_ADJUSTMENT',
]);
export const CreditTransactionType = creditTransactionType.object;
export type CreditTransactionType =
  (typeof CreditTransactionType)[keyof typeof CreditTransactionType];
export const creditTransactionTypeSchema = creditTransactionType.schema;

const reviewDirection = defineEnum(['STUDENT_TO_MENTOR', 'MENTOR_TO_STUDENT']);
export const ReviewDirection = reviewDirection.object;
export type ReviewDirection = (typeof ReviewDirection)[keyof typeof ReviewDirection];
export const reviewDirectionSchema = reviewDirection.schema;

const reviewCategory = defineEnum([
  'DIDACTICS',
  'KNOWLEDGE',
  'PUNCTUALITY',
  'PARTICIPATION',
  'RESPECT',
]);
export const ReviewCategory = reviewCategory.object;
export type ReviewCategory = (typeof ReviewCategory)[keyof typeof ReviewCategory];
export const reviewCategorySchema = reviewCategory.schema;

/** Categorias avaliadas em cada direção. */
export const REVIEW_CATEGORIES_BY_DIRECTION: Record<ReviewDirection, readonly ReviewCategory[]> = {
  STUDENT_TO_MENTOR: ['DIDACTICS', 'KNOWLEDGE', 'PUNCTUALITY'],
  MENTOR_TO_STUDENT: ['PARTICIPATION', 'PUNCTUALITY', 'RESPECT'],
};

const notificationType = defineEnum([
  'SESSION_REQUESTED',
  'SESSION_ACCEPTED',
  'SESSION_REJECTED',
  'SESSION_CANCELLED',
  'SESSION_TIME_PROPOSED',
  'SESSION_REMINDER',
  'SESSION_COMPLETED',
  'SESSION_DISPUTED',
  'REVIEW_RECEIVED',
  'CREDITS_RECEIVED',
]);
export const NotificationType = notificationType.object;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
export const notificationTypeSchema = notificationType.schema;

const reportReason = defineEnum([
  'INAPPROPRIATE_BEHAVIOR',
  'NO_SHOW',
  'SPAM',
  'FAKE_PROFILE',
  'OTHER',
]);
export const ReportReason = reportReason.object;
export type ReportReason = (typeof ReportReason)[keyof typeof ReportReason];
export const reportReasonSchema = reportReason.schema;

const reportStatus = defineEnum(['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED']);
export const ReportStatus = reportStatus.object;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];
export const reportStatusSchema = reportStatus.schema;
