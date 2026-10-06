import type { SessionStatus } from '@know-know/shared';
import { Badge } from '@/components/ui/badge';
import { SESSION_STATUS_LABEL } from '@/lib/labels';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'error';

const TONES: Record<SessionStatus, Tone> = {
  PENDING: 'warning',
  ACCEPTED: 'primary',
  IN_PROGRESS: 'primary',
  AWAITING_CONFIRMATION: 'warning',
  COMPLETED: 'success',
  REJECTED: 'neutral',
  CANCELLED: 'neutral',
  NO_SHOW: 'neutral',
  DISPUTED: 'error',
};

export function SessionStatusBadge({
  status,
  awaitingMyResponse = false,
}: {
  status: SessionStatus;
  awaitingMyResponse?: boolean;
}) {
  if (status === 'PENDING' && awaitingMyResponse) return <Badge tone="warning">Responda</Badge>;
  return <Badge tone={TONES[status]}>{SESSION_STATUS_LABEL[status]}</Badge>;
}
