import { LIMITS, ReportReason } from '@know-know/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/components/ui/error-state';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api-client';

const REASON_LABEL: Record<ReportReason, string> = {
  INAPPROPRIATE_BEHAVIOR: 'Comportamento inadequado',
  NO_SHOW: 'Não apareceu na aula',
  SPAM: 'Spam ou propaganda',
  FAKE_PROFILE: 'Perfil falso',
  OTHER: 'Outro motivo',
};

export function ReportDialog({
  targetUserId,
  targetName,
  sessionId,
  open,
  onOpenChange,
}: {
  targetUserId: string;
  targetName: string;
  sessionId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState<ReportReason>(ReportReason.INAPPROPRIATE_BEHAVIOR);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.post<void>('/reports', {
        targetUserId,
        ...(sessionId ? { sessionId } : {}),
        reason,
        details: details.trim() === '' ? null : details.trim(),
      });
      toast.success('Denúncia enviada. Nossa equipe vai analisar.');
      onOpenChange(false);
      setDetails('');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Denunciar ${targetName}`}
      description="Conte o que aconteceu. Só a nossa equipe vê essa denúncia."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="danger" loading={loading} onClick={() => void submit()}>
            Enviar denúncia
          </Button>
        </>
      }
    >
      <FormField label="Motivo">
        {(control) => (
          <Select
            {...control}
            value={reason}
            onChange={(event) => setReason(event.target.value as ReportReason)}
          >
            {Object.values(ReportReason).map((value) => (
              <option key={value} value={value}>
                {REASON_LABEL[value]}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField label="Detalhes (opcional)" hint={`Até ${LIMITS.reportDetails.max} caracteres.`}>
        {(control) => (
          <Textarea
            {...control}
            rows={4}
            maxLength={LIMITS.reportDetails.max}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}
