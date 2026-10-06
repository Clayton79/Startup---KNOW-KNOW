import {
  Bell,
  CalendarDays,
  Compass,
  Home,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
  Video,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Itens da barra inferior (celular). Poucos e de uso diário. */
export const bottomNavItems: NavItem[] = [
  { to: '/dashboard', label: 'Início', icon: Home },
  { to: '/explorar', label: 'Explorar', icon: Compass },
  { to: '/aulas', label: 'Aulas', icon: Video },
  { to: '/carteira', label: 'Carteira', icon: Wallet },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
];

/** Itens extras da lateral (desktop). */
export const sidebarExtraItems: NavItem[] = [
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/avaliacoes', label: 'Avaliações', icon: Star },
  { to: '/notificacoes', label: 'Notificações', icon: Bell },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export const adminNavItem: NavItem = { to: '/admin', label: 'Administração', icon: ShieldCheck };
