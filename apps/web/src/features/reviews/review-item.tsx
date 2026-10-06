import type { ReviewCategory, ReviewView } from '@know-know/shared';
import { Star } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { formatTimeAgo } from '@/lib/datetime';

const CATEGORY_SHORT: Record<ReviewCategory, string> = {
  DIDACTICS: 'Didática',
  KNOWLEDGE: 'Conhecimento',
  PUNCTUALITY: 'Pontualidade',
  PARTICIPATION: 'Participação',
  RESPECT: 'Respeito',
};

export function ReviewItem({ review }: { review: ReviewView }) {
  return (
    <article className="space-y-2 rounded-lg border border-border bg-surface p-4">
      <header className="flex items-center gap-3">
        <Avatar name={review.author.displayName} src={review.author.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{review.author.displayName}</p>
          <p className="text-xs text-fg-muted">
            {review.skillName} · {formatTimeAgo(review.createdAt)}
          </p>
        </div>
        <p
          className="inline-flex items-center gap-1 font-bold"
          aria-label={`Nota ${review.rating} de 5`}
        >
          <Star aria-hidden="true" className="size-4 fill-credit text-credit" />
          {review.rating}/5
        </p>
      </header>
      {review.comment ? <p className="whitespace-pre-line">“{review.comment}”</p> : null}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
        {review.scores.map((score) => (
          <li key={score.category}>
            {CATEGORY_SHORT[score.category]}: {score.score}/5
          </li>
        ))}
      </ul>
    </article>
  );
}
