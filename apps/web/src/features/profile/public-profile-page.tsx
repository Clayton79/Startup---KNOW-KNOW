import { Flag, GraduationCap, UserX } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageMeta } from '@/components/seo/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportDialog } from '@/features/reports/report-dialog';
import { ReviewItem } from '@/features/reviews/review-item';
import { useUserReviews } from '@/features/reviews/use-reviews';
import { RequestSessionDialog } from '@/features/sessions/request-session-dialog';
import { ApiError } from '@/lib/api-client';
import { ProfileView } from './profile-view';
import { useMe, usePublicProfile } from './use-profile';

function UserReviews({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const { data, isPending } = useUserReviews(userId, page);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  if (isPending || !data || data.total === 0) return null;

  return (
    <section aria-labelledby="avaliacoes-recebidas" className="space-y-3">
      <h2 id="avaliacoes-recebidas" className="text-lg font-bold">
        Avaliações
      </h2>
      <ul className="space-y-3">
        {data.items.map((review) => (
          <li key={review.id}>
            <ReviewItem review={review} />
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Mais novas
          </Button>
          <span className="text-sm text-fg-muted">
            {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Mais antigas
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function PublicProfilePage() {
  const { id } = useParams();
  const { data: me } = useMe();
  const { data: profile, isPending, isError, error, refetch } = usePublicProfile(id);
  const [requesting, setRequesting] = useState(false);
  const [reporting, setReporting] = useState(false);

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

  const isMe = me?.id === profile.id;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageMeta title={profile.displayName} noindex />
      <ProfileView
        profile={profile}
        actions={
          isMe ? (
            <Button asChild variant="outline">
              <Link to="/perfil/editar">Editar perfil</Link>
            </Button>
          ) : (
            <>
              {profile.teachingSkills.length > 0 ? (
                <Button onClick={() => setRequesting(true)}>
                  <GraduationCap aria-hidden="true" className="size-5" />
                  Solicitar aula
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => setReporting(true)}>
                <Flag aria-hidden="true" className="size-4" />
                Denunciar
              </Button>
            </>
          )
        }
      />
      <UserReviews userId={profile.id} />

      {!isMe ? (
        <>
          <RequestSessionDialog
            mentorId={profile.id}
            open={requesting}
            onOpenChange={setRequesting}
          />
          <ReportDialog
            targetUserId={profile.id}
            targetName={profile.displayName}
            open={reporting}
            onOpenChange={setReporting}
          />
        </>
      ) : null}
    </div>
  );
}
