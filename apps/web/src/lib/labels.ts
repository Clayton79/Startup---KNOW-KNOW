import type {
  CreditTransactionType,
  PreferredMode,
  SessionMode,
  SessionStatus,
  SkillLevel,
} from '@know-know/shared';

export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  BASIC: 'Básico',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
};

export const PREFERRED_MODE_LABEL: Record<PreferredMode, string> = {
  ONLINE: 'Online',
  IN_PERSON: 'Presencial',
  BOTH: 'Online e presencial',
};

export const SESSION_MODE_LABEL: Record<SessionMode, string> = {
  ONLINE: 'Online',
  IN_PERSON: 'Presencial',
};

export const WEEKDAY_LABEL = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

/** Ordem de exibição: semana começando na segunda. */
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  PENDING: 'Aguardando resposta',
  ACCEPTED: 'Confirmada',
  REJECTED: 'Recusada',
  CANCELLED: 'Cancelada',
  IN_PROGRESS: 'Em andamento',
  AWAITING_CONFIRMATION: 'Aguardando confirmação',
  COMPLETED: 'Concluída',
  NO_SHOW: 'Não aconteceu',
  DISPUTED: 'Em revisão',
};

export const TRANSACTION_TYPE_LABEL: Record<CreditTransactionType, string> = {
  EARNED_CLASS: 'Aula ensinada',
  SPENT_CLASS: 'Aula assistida',
  BONUS: 'Bônus',
  REFUND: 'Estorno',
  ADMIN_ADJUSTMENT: 'Ajuste da equipe',
};
