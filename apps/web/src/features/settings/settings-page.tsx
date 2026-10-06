import { LogOut, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageMeta } from '@/components/seo/page-meta';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { errorMessage } from '@/components/ui/error-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/features/auth/auth-provider';
import { useMe } from '@/features/profile/use-profile';
import { api } from '@/lib/api-client';

function DeleteAccount() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);

  const remove = async () => {
    setLoading(true);
    try {
      await api.delete<void>('/me', { confirmation: 'EXCLUIR' });
      // A API já bloqueou a conta; encerramos a sessão local.
      await signOut().catch(() => undefined);
      toast.success('Conta excluída. Sentiremos sua falta.');
      void navigate('/', { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
      setLoading(false);
    }
  };

  return (
    <Card className="space-y-4 border-error/40">
      <h2 className="flex items-center gap-2 text-xl font-bold text-error">
        <ShieldAlert aria-hidden="true" className="size-5" />
        Excluir minha conta
      </h2>
      <p className="text-fg-muted">
        Removemos seus dados pessoais (nome, foto, bio, cidade, conhecimentos e horários) e
        cancelamos aulas futuras. Seus créditos restantes são perdidos. O histórico das aulas fica
        anonimizado para os outros participantes. Isso não pode ser desfeito.
      </p>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Excluir minha conta
      </Button>

      <Modal
        open={open}
        onOpenChange={(next) => !loading && setOpen(next)}
        title="Excluir a conta de vez?"
        description="Para confirmar, digite EXCLUIR."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Manter minha conta
            </Button>
            <Button
              variant="danger"
              disabled={word !== 'EXCLUIR'}
              loading={loading}
              onClick={() => void remove()}
            >
              Excluir para sempre
            </Button>
          </>
        }
      >
        <FormField label="Digite EXCLUIR">
          {(control) => (
            <Input
              {...control}
              autoComplete="off"
              value={word}
              onChange={(event) => setWord(event.target.value)}
            />
          )}
        </FormField>
      </Modal>
    </Card>
  );
}

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { data: me } = useMe();

  const logout = async () => {
    try {
      await signOut();
    } catch {
      toast.error('Não conseguimos sair agora. Tente de novo.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageMeta title="Configurações" noindex />
      <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">Configurações</h1>

      <Card className="space-y-4">
        <h2 className="text-xl font-bold">Conta</h2>
        <dl className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <dt className="font-semibold text-fg-muted">E-mail</dt>
          <dd className="break-all">{user?.email ?? '—'}</dd>
          <dt className="font-semibold text-fg-muted">Fuso horário</dt>
          <dd>{me?.timezone ?? '—'}</dd>
        </dl>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/perfil/editar">Editar perfil</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/esqueci-minha-senha">Trocar a senha</Link>
          </Button>
          <Button variant="ghost" onClick={() => void logout()}>
            <LogOut aria-hidden="true" className="size-4" />
            Sair
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl font-bold">Privacidade</h2>
        <p className="text-fg-muted">
          Coletamos só o que é necessário para a troca de conhecimento funcionar. Leia como tratamos
          seus dados e quais são seus direitos.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/privacidade">Política de privacidade</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/termos">Termos de uso</Link>
          </Button>
        </div>
        <Alert tone="info">
          A exportação dos seus dados está no roadmap. Enquanto isso, você pode pedir uma cópia pelo
          contato da equipe.
        </Alert>
      </Card>

      <DeleteAccount />
    </div>
  );
}
