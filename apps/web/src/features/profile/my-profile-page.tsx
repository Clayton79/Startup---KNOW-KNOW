import { Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/seo/page-meta';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileView } from './profile-view';
import { useMe } from './use-profile';

export function MyProfilePage() {
  const { data: me, isPending, isError, error, refetch } = useMe();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageMeta title="Meu perfil" noindex />
      {isPending ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <ProfileView
          profile={me}
          actions={
            <Button asChild variant="outline">
              <Link to="/perfil/editar">
                <Pencil aria-hidden="true" className="size-4" />
                Editar perfil
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
