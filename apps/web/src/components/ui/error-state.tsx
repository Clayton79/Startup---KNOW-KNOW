import { RefreshCw } from 'lucide-react';
import { ApiError } from '@/lib/api-client';
import { Alert } from './alert';
import { Button } from './button';

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Algo deu errado. Tente novamente em instantes.';
}

/** Estado de erro padrão para telas que buscam dados. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="space-y-3">
      <Alert tone="error" title="Não deu para carregar agora">
        {errorMessage(error)}
      </Alert>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden="true" className="size-4" />
          Tentar de novo
        </Button>
      ) : null}
    </div>
  );
}
