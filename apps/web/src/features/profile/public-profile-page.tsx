import { UserX } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageMeta } from '@/components/seo/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-client';
import { ProfileView } from './profile-view';
import { usePublicProfile } from './use-profile';

export function PublicProfilePage() {
  const { id } = useParams();
  const { data: profile, isPending, isError, error, refetch } = usePublicProfile(id);

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <div className="mx-auto max-w-3xl">
        <PageMeta title="Perfil" noindex />
        {notFound ? (
          <EmptyState
            icon={UserX}
            title="Não encontramos essa pessoa"
            description="O perfil pode ter sido removido ou o endereço está incorreto."
            action={
              <Button asChild>
                <Link to="/explorar">Explorar conhecimentos</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageMeta title={profile.displayName} noindex />
      <ProfileView profile={profile} />
    </div>
  );
}
