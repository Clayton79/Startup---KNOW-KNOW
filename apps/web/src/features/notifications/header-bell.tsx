import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUnreadCount } from './use-notifications';

export function HeaderBell() {
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;

  return (
    <Link
      to="/notificacoes"
      aria-label={count > 0 ? `Notificações: ${count} não lidas` : 'Notificações'}
      className="relative inline-flex size-11 items-center justify-center rounded-full text-fg hover:bg-surface-muted"
    >
      <Bell aria-hidden="true" className="size-6" />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-error px-1 text-xs font-bold text-primary-foreground"
        >
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </Link>
  );
}
