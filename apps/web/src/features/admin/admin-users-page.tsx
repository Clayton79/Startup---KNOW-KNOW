import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState, errorMessage } from '@/components/ui/error-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDay } from '@/lib/datetime';
import { adminApi } from './admin-api';

function AdjustCredits({
  userId,
  name,
  onClose,
}: {
  userId: string;
  name: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      adminApi.adjustCredits({ userId, amount: Number(amount), description: description.trim() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
  const valid =
    Number.isInteger(Number(amount)) && Number(amount) !== 0 && description.trim().length >= 3;

  const submit = async () => {
    try {
      const result = await mutation.mutateAsync();
      toast.success(`Ajuste feito. Novo saldo: ${result.balance}.`);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Ajustar créditos de ${name}`}
      description="Fica registrado no histórico com o seu nome. Use valor negativo para debitar."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!valid} loading={mutation.isPending} onClick={() => void submit()}>
            Confirmar ajuste
          </Button>
        </>
      }
    >
      <FormField label="Valor (créditos)">
        {(control) => (
          <Input
            {...control}
            type="number"
            inputMode="numeric"
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        )}
      </FormField>
      <FormField label="Motivo">
        {(control) => (
          <Input
            {...control}
            maxLength={150}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<{ id: string; name: string } | null>(null);
  const q = useDebouncedValue(text.trim());

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'users', q, page],
    queryFn: () => adminApi.users({ ...(q ? { q } : {}), page }),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      adminApi.setUserStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  const toggle = async (id: string, status: 'ACTIVE' | 'SUSPENDED') => {
    try {
      await setStatus.mutateAsync({ id, status });
      toast.success(status === 'SUSPENDED' ? 'Conta suspensa.' : 'Conta reativada.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="busca-usuarios" className="sr-only">
          Buscar usuário pelo nome
        </label>
        <Input
          id="busca-usuarios"
          type="search"
          placeholder="Buscar pelo nome"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-surface p-5 text-fg-muted">
          Nenhum usuário encontrado.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Usuários da plataforma</caption>
              <thead className="bg-surface-muted text-fg-muted">
                <tr>
                  <th scope="col" className="p-3">
                    Nome
                  </th>
                  <th scope="col" className="p-3">
                    Situação
                  </th>
                  <th scope="col" className="p-3">
                    Aulas
                  </th>
                  <th scope="col" className="p-3">
                    Saldo
                  </th>
                  <th scope="col" className="p-3">
                    Desde
                  </th>
                  <th scope="col" className="p-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((user) => (
                  <tr key={user.id}>
                    <th scope="row" className="p-3 font-semibold">
                      {user.displayName}
                      {user.role === 'ADMIN' ? (
                        <Badge tone="primary" className="ml-2">
                          admin
                        </Badge>
                      ) : null}
                    </th>
                    <td className="p-3">
                      <Badge
                        tone={
                          user.status === 'ACTIVE'
                            ? 'success'
                            : user.status === 'SUSPENDED'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {user.status === 'ACTIVE'
                          ? 'Ativa'
                          : user.status === 'SUSPENDED'
                            ? 'Suspensa'
                            : 'Excluída'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {user.sessionsTaught} / {user.sessionsLearned}
                    </td>
                    <td className="p-3">{user.balance}</td>
                    <td className="p-3">{formatDay(user.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {user.status !== 'DELETED' ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAdjusting({ id: user.id, name: user.displayName })}
                            >
                              Créditos
                            </Button>
                            <Button
                              size="sm"
                              variant={user.status === 'ACTIVE' ? 'danger' : 'primary'}
                              onClick={() =>
                                void toggle(
                                  user.id,
                                  user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                                )
                              }
                            >
                              {user.status === 'ACTIVE' ? 'Suspender' : 'Reativar'}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-fg-muted">Aulas: ensinadas / assistidas.</p>
          {totalPages > 1 ? (
            <nav aria-label="Páginas de usuários" className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-fg-muted">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </Button>
            </nav>
          ) : null}
        </>
      )}

      {adjusting ? (
        <AdjustCredits
          userId={adjusting.id}
          name={adjusting.name}
          onClose={() => setAdjusting(null)}
        />
      ) : null}
    </div>
  );
}
