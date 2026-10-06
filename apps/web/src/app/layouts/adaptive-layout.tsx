import { useAuth } from '@/features/auth/auth-provider';
import { AppLayout } from './app-layout';
import { PublicLayout } from './public-layout';

/** Páginas abertas a todos que, com login, aparecem dentro do app (sidebar, saldo, notificações). */
export function AdaptiveLayout() {
  const { status } = useAuth();
  return status === 'authenticated' ? <AppLayout /> : <PublicLayout />;
}
