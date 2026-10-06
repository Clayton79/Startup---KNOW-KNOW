import type { ReportReason, ReportStatus } from '@know-know/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, errorMessage } from '@/components/ui/error-state';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo } from '@/lib/datetime';
import { adminApi } from './admin-api';

const REASON: Record<ReportReason, string> = {
  INAPPROPRIATE_BEHAVIOR: 'Comportamento inadequado',
  NO_SHOW: 'Não apareceu na aula',
  SPAM: 'Spam ou propaganda',
  FAKE_PROFILE: 'Perfil falso',
  OTHER: 'Outro motivo',
};

const STATUS: Record<
  ReportStatus,
  { label: string; tone: 'warning' | 'primary' | 'success' | 'neutral' }
> = {
  OPEN: { label: 'Aberta', tone: 'warning' },
  REVIEWING: { label: 'Em análise', tone: 'primary' },
  RESOLVED: { label: 'Resolvida', tone: 'success' },
  DISMISSED: { label: 'Descartada', tone: 'neutral' },
};

export function AdminReportsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReportStatus | ''>('OPEN');
  const [page, setPage] = useState(1);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'reports', status, page],
    queryFn: () => adminApi.reports({ ...(status ? { status } : {}), page }),
  });
  const update = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ReportStatus }) =>
      adminApi.updateReport(id, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
  const setReportStatus = async (id: string, next: ReportStatus) => {
    try {
      await update.mutateAsync({ id, next });
      toast.success('Denúncia atualizada.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <label htmlFor="filtro-status" className="mb-1 block text-sm font-semibold">
          Situação
        </label>
        <Select
          id="filtro-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ReportStatus | '');
            setPage(1);
          }}
        >
          <option value="">Todas</option>
          {Object.entries(STATUS).map(([value, item]) => (
            <option key={value} value={value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>

      {isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-surface p-5 text-fg-muted">
          Nenhuma denúncia por aqui.
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {data.items.map((report) => (
              <li key={report.id}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">{REASON[report.reason]}</p>
                    <Badge tone={STATUS[report.status].tone}>{STATUS[report.status].label}</Badge>
                  </div>
                  <p className="text-sm text-fg-muted">
                    <strong>{report.reporter.displayName}</strong> denunciou{' '}
                    <Link
                      to={`/usuario/${report.target.id}`}
                      className="font-semibold text-primary underline"
                    >
                      {report.target.displayName}
                    </Link>{' '}
                    · {formatTimeAgo(report.createdAt)}
                    {report.sessionId ? (
                      <>
                        {' '}
                        · aula{' '}
                        <span className="font-mono text-xs">{report.sessionId.slice(0, 8)}</span>
                      </>
                    ) : null}
                  </p>
                  {report.details ? (
                    <p className="whitespace-pre-line">“{report.details}”</p>
                  ) : null}
                  {report.resolutionNote ? (
                    <p className="text-sm text-fg-muted">Nota: {report.resolutionNote}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {report.status === 'OPEN' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void setReportStatus(report.id, 'REVIEWING')}
                      >
                        Começar análise
                      </Button>
                    ) : null}
                    {report.status === 'OPEN' || report.status === 'REVIEWING' ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => void setReportStatus(report.id, 'RESOLVED')}
                        >
                          Resolver
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void setReportStatus(report.id, 'DISMISSED')}
                        >
                          Descartar
                        </Button>
                      </>
                    ) : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <nav aria-label="Páginas de denúncias" className="flex items-center justify-between">
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
    </div>
  );
}
