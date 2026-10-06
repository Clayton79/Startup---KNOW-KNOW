import { MeetingProvider, SESSION_DURATIONS_MINUTES, SessionMode } from '@know-know/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/components/ui/error-state';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicConfig } from '@/features/config/use-public-config';
import { usePublicProfile } from '@/features/profile/use-profile';
import { useWallet } from '@/features/wallet/use-wallet';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/datetime';
import { formatCredits } from '@/lib/format';
import { SESSION_MODE_LABEL } from '@/lib/labels';
import { SlotPicker } from './slot-picker';
import { sessionsApi } from './sessions-api';
import { useSessionMutation } from './use-sessions';

const PROVIDER_LABEL: Record<string, string> = {
  GOOGLE_MEET: 'Google Meet',
  DISCORD: 'Discord',
  OTHER: 'Outra ferramenta',
};

export function RequestSessionDialog({
  mentorId,
  defaultSkillId,
  open,
  onOpenChange,
}: {
  mentorId: string;
  defaultSkillId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: mentor, isPending } = usePublicProfile(open ? mentorId : undefined);
  const { data: config } = usePublicConfig();
  const { data: wallet } = useWallet();

  const [skillId, setSkillId] = useState<string | null>(defaultSkillId ?? null);
  const [duration, setDuration] = useState<number>(60);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [mode, setMode] = useState<SessionMode | null>(null);
  const [provider, setProvider] = useState<MeetingProvider>(MeetingProvider.GOOGLE_MEET);
  const [note, setNote] = useState('');

  const create = useSessionMutation(sessionsApi.create);

  const effectiveSkillId = skillId ?? mentor?.teachingSkills[0]?.skill.id ?? null;
  const modes: SessionMode[] =
    mentor?.preferredMode === 'ONLINE'
      ? [SessionMode.ONLINE]
      : mentor?.preferredMode === 'IN_PERSON'
        ? [SessionMode.IN_PERSON]
        : [SessionMode.ONLINE, SessionMode.IN_PERSON];
  const effectiveMode = mode && modes.includes(mode) ? mode : (modes[0] as SessionMode);

  const cost = config ? Math.ceil((config.creditsPerHour * duration) / 60) : null;
  const available = wallet?.available ?? null;
  const missing = cost !== null && available !== null ? Math.max(cost - available, 0) : 0;
  const canSubmit = Boolean(effectiveSkillId && startsAt && cost !== null && missing === 0);

  const submit = async () => {
    if (!effectiveSkillId || !startsAt) return;
    try {
      const session = await create.mutateAsync({
        mentorId,
        skillId: effectiveSkillId,
        startsAt,
        durationMinutes: duration,
        mode: effectiveMode,
        ...(effectiveMode === 'ONLINE' ? { meetingProvider: provider } : {}),
        note: note.trim() === '' ? null : note.trim(),
      });
      toast.success('Solicitação enviada.');
      onOpenChange(false);
      void navigate(`/aulas/${session.id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const mentorName = mentor?.displayName ?? 'a pessoa';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={`Solicitar aula com ${mentorName}`}
      description="Escolha o conhecimento, a duração e um horário livre. Os créditos ficam reservados até a resposta."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} loading={create.isPending} onClick={() => void submit()}>
            Enviar solicitação
          </Button>
        </>
      }
    >
      {isPending || !mentor ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          <FormField label="O que você quer aprender?">
            {(control) => (
              <Select
                {...control}
                value={effectiveSkillId ?? ''}
                onChange={(event) => setSkillId(event.target.value)}
              >
                {mentor.teachingSkills.map((item) => (
                  <option key={item.skill.id} value={item.skill.id}>
                    {item.skill.name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Duração</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SESSION_DURATIONS_MINUTES.map((minutes) => {
                const price = config ? Math.ceil((config.creditsPerHour * minutes) / 60) : null;
                const selected = duration === minutes;
                return (
                  <button
                    key={minutes}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setDuration(minutes);
                      setStartsAt(null);
                    }}
                    className={cn(
                      'min-h-14 rounded-md border px-3 py-2 text-left transition-colors',
                      selected
                        ? 'border-primary bg-primary-soft'
                        : 'border-border-strong bg-surface hover:bg-surface-muted',
                    )}
                  >
                    <span className="block font-bold">{minutes} min</span>
                    <span className="block text-sm text-fg-muted">
                      {price !== null ? formatCredits(price) : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Horário</legend>
            <SlotPicker
              userId={mentorId}
              durationMinutes={duration}
              value={startsAt}
              onChange={setStartsAt}
              idPrefix="request"
            />
          </fieldset>

          {modes.length > 1 ? (
            <FormField label="Como prefere a aula?">
              {(control) => (
                <Select
                  {...control}
                  value={effectiveMode}
                  onChange={(event) => setMode(event.target.value as SessionMode)}
                >
                  {modes.map((item) => (
                    <option key={item} value={item}>
                      {SESSION_MODE_LABEL[item]}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          ) : null}

          {effectiveMode === 'ONLINE' ? (
            <FormField label="Ferramenta preferida" hint={`${mentorName} pode ajustar ao aceitar.`}>
              {(control) => (
                <Select
                  {...control}
                  value={provider}
                  onChange={(event) => setProvider(event.target.value as MeetingProvider)}
                >
                  {Object.entries(PROVIDER_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          ) : null}

          <FormField label="Mensagem (opcional)" hint="Conte o que você quer ver na aula.">
            {(control) => (
              <Textarea
                {...control}
                rows={3}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            )}
          </FormField>

          <div className="space-y-2 rounded-md bg-surface-muted p-4 text-sm">
            <p>
              <strong>Resumo:</strong>{' '}
              {mentor.teachingSkills.find((t) => t.skill.id === effectiveSkillId)?.skill.name} ·{' '}
              {duration} min · {startsAt ? formatDateTime(startsAt) : 'escolha um horário'}
            </p>
            <p>
              <strong>Custo:</strong> {cost !== null ? formatCredits(cost) : '—'}
              {available !== null ? ` · Você tem ${formatCredits(available)} disponíveis` : ''}
            </p>
          </div>

          {missing > 0 ? (
            <Alert tone="error">
              Você precisa de mais {formatCredits(missing)} para marcar esta aula. Ensine algo para
              ganhar créditos!
            </Alert>
          ) : null}
        </>
      )}
    </Modal>
  );
}
