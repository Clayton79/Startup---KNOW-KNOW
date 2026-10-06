import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ErrorState } from '@/components/ui/error-state';
import { Spinner } from '@/components/ui/spinner';
import { useMe } from '@/features/profile/use-profile';
import { useAuth } from './auth-provider';

function FullPageSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="size-8" label={label} />
    </div>
  );
}

/** Só entra quem está logado; os demais vão para o login e voltam depois. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner label="Carregando" />;
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Telas de entrada (login, cadastro): quem já está logado vai direto para o painel. */
export function GuestOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageSpinner label="Carregando" />;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/** Garante que o perfil foi montado antes de liberar o app. Usado dentro de RequireAuth. */
export function RequireOnboarded() {
  const { data: me, isPending, isError, error, refetch } = useMe();

  if (isPending) return <FullPageSpinner label="Carregando seu perfil" />;
  if (isError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }
  if (!me.onboarding.completed) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
