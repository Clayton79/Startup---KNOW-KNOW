import type { SessionAction, SessionView } from '@know-know/shared';
import { MeetingProvider } from '@know-know/shared';
import { Check, CircleX, ClockArrowUp, Link2, Star, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { errorMessage } from '@/components/ui/error-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { ReviewDialog } from '@/features/reviews/review-dialog';
import { formatDateTime } from '@/lib/datetime';
import { formatCredits } from '@/lib/format';
import { otherPerson } from './session-copy';
import { SlotPicker } from './slot-picker';
import { sessionsApi } from './sessions-api';
import { useSessionMutation } from './use-sessions';

type DialogName = 'accept' | 'reject' | 'propose' | 'cancel' | 'confirm' | 'meeting' | 'review';

const PROVIDERS: { value: MeetingProvider; label: string }[] = [
  { value: 'GOOGLE_MEET', label: 'Google Meet' },
  { value: 'DISCORD', label: 'Discord' },
  { value: 'OTHER', label: 'Outra ferramenta' },
];

/** Formulário de link/local, usado ao aceitar e ao editar a reunião. */
function MeetingFields({
  session,
  provider,
  setProvider,
  url,
  setUrl,
  location,
  setLocation,
  error,
}: {
  session: SessionView;
  provider: MeetingProvider;
  setProvider: (value: MeetingProvider) => void;
  url: string;
  setUrl: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  error?: string | undefined;
}) {
  if (session.mode === 'IN_PERSON') {
    return (
      <FormField label="Onde vai ser a aula?" hint="Ex.: biblioteca central, café da esquina.">
        {(control) => (
          <Input
            {...control}
            maxLength={200}
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        )}
      </FormField>
    );
  }
  return (
    <>
      <FormField label="Ferramenta">
        {(control) => (
          <Select
            {...control}
            value={provider}
            onChange={(event) => setProvider(event.target.value as MeetingProvider)}
          >
            {PROVIDERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField
        label="Link da reunião"
        hint="Só você e a outra pessoa veem o link, e só depois do aceite."
        error={error}
      >
        {(control) => (
          <Input
            {...control}
            type="url"
            inputMode="url"
            placeholder="https://meet.google.com/…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        )}
      </FormField>
    </>
  );
}

function isHttps(value: string): boolean {
  if (value.trim() === '') return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Botões e diálogos de tudo o que a pessoa pode fazer com a aula agora (vem pronto da API). */
export function SessionActions({ session }: { session: SessionView }) {
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const close = () => setDialog(null);
  const other = otherPerson(session);
  const actions = new Set<SessionAction>(session.allowedActions);

  const accept = useSessionMutation((input: Parameters<typeof sessionsApi.accept>[1]) =>
    sessionsApi.accept(session.id, input),
  );
  const reject = useSessionMutation(() => sessionsApi.reject(session.id));
  const cancel = useSessionMutation(() => sessionsApi.cancel(session.id));
  const confirm = useSessionMutation((happened: boolean) =>
    sessionsApi.confirm(session.id, happened),
  );
  const propose = useSessionMutation((startsAt: string) =>
    sessionsApi.proposeTime(session.id, { startsAt }),
  );
  const meeting = useSessionMutation((input: Parameters<typeof sessionsApi.updateMeeting>[1]) =>
    sessionsApi.updateMeeting(session.id, input),
  );

  // Estado dos formulários de link/local e de novo horário.
  const [provider, setProvider] = useState<MeetingProvider>(
    session.meetingProvider === 'IN_PERSON' ? MeetingProvider.GOOGLE_MEET : session.meetingProvider,
  );
  const [url, setUrl] = useState(session.meetingUrl ?? '');
  const [location, setLocation] = useState(session.locationNote ?? '');
  const [newStart, setNewStart] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | undefined>();

  const meetingPayload = () =>
    session.mode === 'IN_PERSON'
      ? { locationNote: location.trim() === '' ? null : location.trim() }
      : { meetingProvider: provider, meetingUrl: url.trim() === '' ? null : url.trim() };

  const run = async (task: () => Promise<unknown>, success: string) => {
    try {
      await task();
      toast.success(success);
      close();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const validateUrl = (): boolean => {
    const valid = session.mode === 'IN_PERSON' || isHttps(url);
    setUrlError(valid ? undefined : 'Use um link que comece com https://');
    return valid;
  };

  const isMentor = session.myRole === 'MENTOR';
  const acceptingCounter = actions.has('ACCEPT') && !isMentor;

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {actions.has('ACCEPT') ? (
          <Button size="lg" onClick={() => setDialog('accept')}>
            <Check aria-hidden="true" className="size-5" />
            {acceptingCounter ? 'Aceitar novo horário' : 'Aceitar'}
          </Button>
        ) : null}
        {actions.has('PROPOSE_TIME') ? (
          <Button size="lg" variant="outline" onClick={() => setDialog('propose')}>
            <ClockArrowUp aria-hidden="true" className="size-5" />
            Sugerir outro horário
          </Button>
        ) : null}
        {actions.has('REJECT') ? (
          <Button size="lg" variant="ghost" onClick={() => setDialog('reject')}>
            <CircleX aria-hidden="true" className="size-5" />
            Recusar
          </Button>
        ) : null}
        {actions.has('CONFIRM') ? (
          <Button size="lg" onClick={() => setDialog('confirm')}>
            <ThumbsUp aria-hidden="true" className="size-5" />
            Essa aula aconteceu?
          </Button>
        ) : null}
        {actions.has('REVIEW') ? (
          <Button size="lg" onClick={() => setDialog('review')}>
            <Star aria-hidden="true" className="size-5" />
            Avaliar {other.displayName}
          </Button>
        ) : null}
        {actions.has('UPDATE_MEETING') ? (
          <Button size="lg" variant="outline" onClick={() => setDialog('meeting')}>
            <Link2 aria-hidden="true" className="size-5" />
            {session.mode === 'IN_PERSON'
              ? 'Definir local'
              : session.meetingUrl
                ? 'Editar link'
                : 'Adicionar link'}
          </Button>
        ) : null}
        {actions.has('CANCEL') ? (
          <Button size="lg" variant="ghost" onClick={() => setDialog('cancel')}>
            <X aria-hidden="true" className="size-5" />
            {session.status === 'PENDING' ? 'Cancelar solicitação' : 'Cancelar aula'}
          </Button>
        ) : null}
      </div>

      {/* Aceitar */}
      <Modal
        open={dialog === 'accept'}
        onOpenChange={(open) => !open && close()}
        title={
          acceptingCounter ? 'Aceitar o novo horário?' : `Aceitar a aula de ${session.skill.name}?`
        }
        description={`${formatDateTime(session.startsAt)} · ${session.durationMinutes} min`}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Voltar
            </Button>
            <Button
              loading={accept.isPending}
              onClick={() => {
                if (isMentor && !validateUrl()) return;
                void run(
                  () => accept.mutateAsync(isMentor ? meetingPayload() : {}),
                  'Aula aceita.',
                );
              }}
            >
              Aceitar aula
            </Button>
          </>
        }
      >
        {isMentor ? (
          <MeetingFields
            session={session}
            provider={provider}
            setProvider={setProvider}
            url={url}
            setUrl={setUrl}
            location={location}
            setLocation={setLocation}
            error={urlError}
          />
        ) : (
          <p>
            Os {formatCredits(session.creditCost)} já estão reservados. Se alguém cancelar antes da
            aula, eles voltam para você.
          </p>
        )}
      </Modal>

      {/* Link / local */}
      <Modal
        open={dialog === 'meeting'}
        onOpenChange={(open) => !open && close()}
        title={session.mode === 'IN_PERSON' ? 'Local da aula' : 'Link da reunião'}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Voltar
            </Button>
            <Button
              loading={meeting.isPending}
              onClick={() => {
                if (!validateUrl()) return;
                void run(() => meeting.mutateAsync(meetingPayload()), 'Aula atualizada.');
              }}
            >
              Salvar
            </Button>
          </>
        }
      >
        <MeetingFields
          session={session}
          provider={provider}
          setProvider={setProvider}
          url={url}
          setUrl={setUrl}
          location={location}
          setLocation={setLocation}
          error={urlError}
        />
      </Modal>

      {/* Sugerir outro horário */}
      <Modal
        open={dialog === 'propose'}
        onOpenChange={(open) => !open && close()}
        size="lg"
        title="Sugerir outro horário"
        description={`${other.displayName} vai poder aceitar, recusar ou sugerir de novo.`}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Voltar
            </Button>
            <Button
              disabled={!newStart}
              loading={propose.isPending}
              onClick={() =>
                newStart && void run(() => propose.mutateAsync(newStart), 'Horário sugerido.')
              }
            >
              Enviar sugestão
            </Button>
          </>
        }
      >
        <SlotPicker
          userId={session.mentor.id}
          durationMinutes={session.durationMinutes}
          value={newStart}
          onChange={setNewStart}
          idPrefix="propose"
        />
      </Modal>

      <ConfirmDialog
        open={dialog === 'reject'}
        onOpenChange={(open) => !open && close()}
        title="Recusar esta solicitação?"
        description={`${other.displayName} será avisado e os créditos reservados voltam para a pessoa.`}
        confirmLabel="Recusar"
        tone="danger"
        onConfirm={async () => {
          await reject.mutateAsync(undefined);
          toast.success('Solicitação recusada.');
        }}
      />

      <ConfirmDialog
        open={dialog === 'cancel'}
        onOpenChange={(open) => !open && close()}
        title={session.status === 'PENDING' ? 'Cancelar a solicitação?' : 'Cancelar esta aula?'}
        description={
          isMentor
            ? `${other.displayName} será avisado e os créditos reservados voltam para a pessoa.`
            : `${other.displayName} será avisado. Seus créditos reservados voltam para você.`
        }
        confirmLabel="Cancelar aula"
        cancelLabel="Manter"
        tone="danger"
        onConfirm={async () => {
          await cancel.mutateAsync(undefined);
          toast.success('Aula cancelada.');
        }}
      />

      {/* Confirmação pós-aula */}
      <Modal
        open={dialog === 'confirm'}
        onOpenChange={(open) => !open && close()}
        title="Essa aula aconteceu?"
        description={`${session.skill.name} com ${other.displayName}, ${formatDateTime(session.startsAt)}.`}
        footer={
          <>
            <Button
              variant="outline"
              loading={confirm.isPending}
              onClick={() => void run(() => confirm.mutateAsync(false), 'Resposta registrada.')}
            >
              <ThumbsDown aria-hidden="true" className="size-5" />
              Não aconteceu
            </Button>
            <Button
              loading={confirm.isPending}
              onClick={() => void run(() => confirm.mutateAsync(true), 'Resposta registrada.')}
            >
              <ThumbsUp aria-hidden="true" className="size-5" />
              Sim, aconteceu
            </Button>
          </>
        }
      >
        <p>
          Os créditos só mudam de mãos quando <strong>os dois</strong> confirmam que a aula
          aconteceu. {session.otherHasConfirmed ? `${other.displayName} já respondeu.` : null}
        </p>
      </Modal>

      {actions.has('REVIEW') || dialog === 'review' ? (
        <ReviewDialog
          sessionId={session.id}
          direction={isMentor ? 'MENTOR_TO_STUDENT' : 'STUDENT_TO_MENTOR'}
          personName={other.displayName}
          open={dialog === 'review'}
          onOpenChange={(open) => !open && close()}
        />
      ) : null}
    </>
  );
}
